import React, { Component } from 'react';

export default function DisplayControl(ControlComponent) {
  return class DisplayControlComponent extends Component {
    constructor(props) {
      super(props);

      this.state = props.display.options;
    }

    handleChange = (name, value, data) => {
      const { display } = this.props;
      const obj = { [name]: value, ...data };

      this.setState(obj);

      display.update(obj);
    };

    render() {
      return <ControlComponent onChange={this.handleChange} {...this.props} {...this.state} />;
    }
  };
}
