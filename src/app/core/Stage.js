import { WebGLRenderer, Color } from 'three';
import Scene from 'core/Scene';
import Display, { resetCount } from 'core/Display';
import List from 'core/List';
import Composer from 'graphics/Composer';
import { CanvasBuffer, GLBuffer } from 'graphics/FrameBuffer';
import { logger, raiseError, events } from 'app/global';
import * as displayLibrary from 'lib/displays';
import * as effectsLibrary from 'lib/effects';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from 'app/constants';

export default class Stage extends Display {
  static label = 'Stage';

  static className = 'Stage';

  static defaultOptions = {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    zoom: 1.0,
    backgroundColor: '#000000',
  };

  constructor(options) {
    super(Stage, options);

    this.scenes = new List();
    this.shouldRender = true;
  }

  init(canvas) {
    const { width, height, backgroundColor } = this.options;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      premultipliedAlpha: true,
      alpha: false,
    });

    this.renderer.setSize(width, height);
    this.renderer.autoClear = false;

    this.composer = new Composer(this.renderer);

    this.buffer2D = new CanvasBuffer(width, height);
    this.buffer3D = new GLBuffer(width, height);

    this.backgroundColor = new Color(backgroundColor);
  }

  update(options) {
    const changed = super.update(options);

    if (changed) {
      if (options.width !== undefined || options.height !== undefined) {
        this.setSize(this.options.width, this.options.height);
      }

      if (options.backgroundColor !== undefined) {
        this.backgroundColor.set(options.backgroundColor);
      }
    }

    return changed;
  }

  addScene(scene = new Scene(), index) {
    if (index !== undefined) {
      this.scenes.insert(index, scene);
    } else {
      this.scenes.add(scene);
    }

    scene.stage = this;

    if (scene.addToStage) {
      scene.addToStage(this);
    }

    this.changed = true;

    return scene;
  }

  removeScene(scene) {
    this.scenes.remove(scene);

    scene.stage = null;

    scene.removeFromStage(this);

    this.changed = true;
  }

  shiftScene(scene, i) {
    const index = this.scenes.indexOf(scene);

    this.changed = this.scenes.swap(index, index + i);

    return this.changed;
  }

  clearScenes() {
    this.scenes.items.forEach(scene => {
      this.removeScene(scene);
    });

    resetCount();

    this.changed = true;
  }

  getSortedDisplays() {
    return this.scenes.items.reverse().reduce((displays, scene) => {
      displays.push(scene);

      scene.effects.items.reverse().forEach(effect => {
        displays.push(effect);
      });

      scene.displays.items.reverse().forEach(display => {
        displays.push(display);
      });

      return displays;
    }, []);
  }

  hasScenes() {
    return this.scenes.length > 0;
  }

  hasChanges() {
    if (this.changed) {
      return true;
    }

    let changes = false;

    this.scenes.items.forEach(scene => {
      if (!changes && scene.hasChanges()) {
        changes = true;
      }
    });

    return changes;
  }

  resetChanges() {
    this.changed = false;

    this.scenes.items.forEach(scene => {
      scene.resetChanges();
    });
  }

  getImage(callback, format) {
    const img = this.renderer.domElement.toDataURL(format || 'image/png');
    const base64 = img.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    if (callback) callback(buffer);
  }

  getSize() {
    if (this.composer) {
      return this.composer.getSize();
    }

    return { width: 0, height: 0 };
  }

  setSize(width, height) {
    this.scenes.items.forEach(scene => {
      scene.setSize(width, height);
    });

    this.composer.setSize(width, height);

    this.buffer2D.setSize(width, height);
    this.buffer3D.setSize(width, height);

    events.emit('stage-resize');
  }

  setZoom(val) {
    const { zoom } = this.options;

    if (val > 0) {
      if (zoom < 1.0) {
        this.update({ zoom: zoom + 0.25 });
      }
    } else if (val < 0) {
      if (zoom > 0.25) {
        this.update({ zoom: zoom - 0.25 });
      }
    } else {
      this.update({ zoom: 1.0 });
    }

    events.emit('zoom');
  }

  loadConfig(config) {
    if (typeof config === 'object') {
      this.clearScenes();

      if (config.scenes) {
        config.scenes.forEach(scene => {
          const newScene = new Scene(scene.options);

          this.addScene(newScene);

          const loadReactors = (reactors, element) => {
            Object.keys(reactors).forEach(key => {
              element.setReactor(key, reactors[key]);
            });
          };

          const loadComponent = (lib, { name, options, reactors }) => {
            const Component = lib[name];

            if (Component) {
              const element = newScene.addElement(new Component(options));
              if (reactors) {
                loadReactors(reactors, element);
              }
            } else {
              logger.warn('Component not found:', name);
            }
          };

          if (scene.displays) {
            scene.displays.forEach(display => loadComponent(displayLibrary, display));
          }

          if (scene.effects) {
            scene.effects.forEach(effect => loadComponent(effectsLibrary, effect));
          }

          if (scene.reactors) {
            loadReactors(scene.reactors, newScene);
          }
        });
      }

      if (config.stage) {
        this.update(config.stage.options);
      } else {
        this.update(Stage.defaultOptions);
      }
    } else {
      raiseError('Invalid project data.');
    }
  }

  render(data, callback) {
    const { composer, scenes } = this;

    composer.clear(this.backgroundColor, 1);

    scenes.items.forEach(scene => {
      if (scene.options.enabled) {
        this.renderScene(scene, data);
      }
    });

    composer.renderToScreen();

    if (callback) callback();
  }

  renderScene(scene, data) {
    const buffer = scene.render(data);

    this.composer.blendBuffer(buffer, { ...scene.options });
  }

  toJSON() {
    return {
      name: this.name,
      options: this.options,
    };
  }
}
