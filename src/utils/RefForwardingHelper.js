
import React, { forwardRef } from 'react';

/**
 * Helper to create components that correctly use refs
 * instead of findDOMNode which is deprecated
 */
export const createRefForwardingComponent = (Component) => {
  return forwardRef((props, ref) => {
    return <Component {...props} ref={ref} />;
  });
};

/**
 * Use this wrapper when you need to reference a component's DOM node
 * @param {ReactComponent} WrappedComponent - The component to wrap
 * @returns {ReactComponent} - A component with proper ref forwarding
 */
export const withRef = (WrappedComponent) => {
  return forwardRef((props, ref) => {
    return <WrappedComponent {...props} forwardedRef={ref} />;
  });
};
