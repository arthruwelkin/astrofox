import React, { Fragment, PureComponent } from 'react';
import withAppContext from 'components/hocs/withAppContext';
import Button from 'components/interface/Button';
import Checkmark from 'components/interface/Checkmark';
import Spinner from 'components/interface/Spinner';
import styles from './AppUpdates.less';

class AppUpdates extends PureComponent {
  constructor(props) {
    super(props);

    this.appUpdater = props.app.updater;
  }

  componentDidMount() {
    const { checking, downloading, downloadComplete, installing } = this.appUpdater;

    this.appUpdater.on('status', this.updateStatus, this);

    if (!checking && !downloading && !downloadComplete && !installing) {
      // Let css animation complete
      setTimeout(() => {
        this.appUpdater.checkForUpdates();
      }, 1000);
    }
  }

  componentWillUnmount() {
    this.appUpdater.off('status', this.updateStatus, this);
  }

  installUpdate = () => {
    this.appUpdater.quitAndInstall();
  };

  downloadUpdate = () => {
    this.appUpdater.downloadUpdate();
  };

  updateStatus = () => this.forceUpdate();

  getMessage() {
    const {
      error,
      downloading,
      downloadComplete,
      installing,
      checked,
      hasUpdate,
      info: { version },
    } = this.appUpdater;

    let message = 'Checking for updates...';

    if (error) {
      message = 'An error has occured. Unable to check for updates.';
    } else if (downloading) {
      message = 'Downloading update...';
    } else if (installing) {
      message = 'Installing update...';
    } else if (downloadComplete) {
      message = `A new update (${version}) is ready to install.`;
    } else if (hasUpdate) {
      message = `A new update (${version}) is available to download and install.`;
    } else if (checked) {
      message = 'You have the latest version.';
    }

    return message;
  }

  getIcon() {
    const { checked, hasUpdate } = this.appUpdater;

    return checked && !hasUpdate ? (
      <Checkmark className={styles.icon} size={30} />
    ) : (
      <Spinner className={styles.icon} size={30} />
    );
  }

  render() {
    const { onClose } = this.props;
    const { installing, downloading, downloadComplete, hasUpdate } = this.appUpdater;

    let installButton;
    let downloadButton;
    let closeText = 'Close';

    if (downloadComplete && !installing) {
      installButton = <Button text="Restart and Install Now" onClick={this.installUpdate} />;
      closeText = 'Install Later';
    }

    if (hasUpdate && !downloading && !downloadComplete) {
      downloadButton = <Button text="Download Now" onClick={this.downloadUpdate} />;
    }

    return (
      <Fragment>
        <div className={styles.message}>
          {this.getIcon()}
          {this.getMessage()}
        </div>
        <div className={styles.buttons}>
          {installButton}
          {downloadButton}
          <Button className={styles.button} text={closeText} onClick={onClose} />
        </div>
      </Fragment>
    );
  }
}

export default withAppContext(AppUpdates);
