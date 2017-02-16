import { clone, reduce, assign, camelCase, noop } from 'lodash';

/* TODO: Add typechecking
type ModuleConfig = {
  initialState?: any;
  actions?: { [type: string]: {
    actionCreator: Function,
    transition: Function
  } };
  asyncActions?: { [type: string]: {
    promise: Function,
    actionCreator?: Function,
    request?: Function,
    success?: Function,
    error?: Function
  } };
  subscribed?: { [type: string]: Function };
};
*/

export function reduxModule(config /*: ModuleConfig */ = {}) {
  const _config = clone(config);
  if (!_config.initialState) _config.initialState = {};
  if (!_config.actions) _config.actions = {};
  if (!_config.subscribed) _config.subscribed = {};
  if (!_config.asyncActions) _config.asyncActions = {};

  const types = assign({},
    reduce(_config.actions,
      (t, f, a) => ({ ...t, [a]: f.transition || noop }),
      {}),
    reduce(_config.subscribed,
      (t, f, a) => ({ ...t, [a]: f || noop }),
      {}),
    reduce(_config.asyncActions, (t, f, a) => ({
      ...t,
      [`${a}`]: f.request || noop,
      [`${a}_SUCCESS`]: f.success || noop,
      [`${a}_ERROR`]: f.error || noop,
    }), {}));

  const actions = assign({},
    reduce(_config.actions, (t, f, a) => {
      const _action = (...args) => assign({
        type: a,
        ...f.actionCreator(...args),
      });
      _action.type = a;
      return { ...t, [camelCase(`${a}`)]: _action };
    }, {}),
    reduce(_config.asyncActions, (t, f, a) => {
      const _action = (...args) => assign({
        type: a,
        responseTypes: [`${a}_SUCCESS`, `${a}_ERROR`],
        promise: f.promise(...args),
        ...(f.actionCreator || noop)(...args),
      });
      _action.promise = a;
      _action.success = `${a}_SUCCESS`;
      _action.error = `${a}_ERROR`;
      return { ...t, [camelCase(`${a}`)]: _action };
    }, {}));

  const reducer = (
    state /*: any */= _config.initialState,
    { type, ...payload } /*: any & {
      type: string
    } */
  ) => {
    if (types[type]) {
      return types[type](payload, state) || clone(state);
    }
    return clone(state);
  };
  return { types, actions, reducer };
}
