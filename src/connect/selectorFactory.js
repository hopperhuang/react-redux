import verifySubselectors from './verifySubselectors'

export function impureFinalPropsSelectorFactory(
  // mapStateToProps => mapToPropsProxy ;see: /src/connect/wrapMapToProps
  // mapStateToProps => constantSelector; see: /src/connect/wrapMapToProps
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  dispatch
) {
  return function impureFinalPropsSelector(state, ownProps) {
    return mergeProps(
      mapStateToProps(state, ownProps),
      mapDispatchToProps(dispatch, ownProps),
      ownProps
    )
  }
}

export function pureFinalPropsSelectorFactory(
  // mapStateToProps => mapToPropsProxy ;see: /src/connect/wrapMapToProps
  // mapStateToProps => constantSelector; see: /src/connect/wrapMapToProps
  mapStateToProps,
  // mapStateToProps => mapToPropsProxy ;see: /src/connect/wrapMapToProps
  // mapStateToProps => constantSelector; see: /src/connect/wrapMapToProps
  // mapStateToProps => constantSelector; see: /src/connect/wrapMapToProps
  mapDispatchToProps,
  //  defaultMergeProps see: /src/connect/mergeProps
  //  mergeProps => see: /src/connect/mergeProps
  mergeProps,
  dispatch,
  { areStatesEqual, areOwnPropsEqual, areStatePropsEqual }
) {
  let hasRunAtLeastOnce = false
  let state
  let ownProps
  let stateProps
  let dispatchProps
  let mergedProps

  function handleFirstCall(firstState, firstOwnProps) {
    state = firstState
    ownProps = firstOwnProps
    stateProps = mapStateToProps(state, ownProps)
    dispatchProps = mapDispatchToProps(dispatch, ownProps)
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    hasRunAtLeastOnce = true
    return mergedProps
  }

  function handleNewPropsAndNewState() {
    stateProps = mapStateToProps(state, ownProps)

    if (mapDispatchToProps.dependsOnOwnProps)
      dispatchProps = mapDispatchToProps(dispatch, ownProps)

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    return mergedProps
  }

  function handleNewProps() {
    if (mapStateToProps.dependsOnOwnProps)
      stateProps = mapStateToProps(state, ownProps)

    if (mapDispatchToProps.dependsOnOwnProps)
      dispatchProps = mapDispatchToProps(dispatch, ownProps)

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    return mergedProps
  }

  function handleNewState() {
    const nextStateProps = mapStateToProps(state, ownProps)
    const statePropsChanged = !areStatePropsEqual(nextStateProps, stateProps)
    stateProps = nextStateProps

    if (statePropsChanged)
      mergedProps = mergeProps(stateProps, dispatchProps, ownProps)

    return mergedProps
  }

  function handleSubsequentCalls(nextState, nextOwnProps) {
    const propsChanged = !areOwnPropsEqual(nextOwnProps, ownProps)
    const stateChanged = !areStatesEqual(nextState, state)
    state = nextState
    ownProps = nextOwnProps

    if (propsChanged && stateChanged) return handleNewPropsAndNewState()
    if (propsChanged) return handleNewProps()
    if (stateChanged) return handleNewState()
    return mergedProps
  }

  return function pureFinalPropsSelector(nextState, nextOwnProps) {
    return hasRunAtLeastOnce
      ? handleSubsequentCalls(nextState, nextOwnProps)
      : handleFirstCall(nextState, nextOwnProps)
  }
}

// TODO: Add more comments

// If pure is true, the selector returned by selectorFactory will memoize its results,
// allowing connectAdvanced's shouldComponentUpdate to return false if final
// props have not changed. If false, the selector will always return a new
// object and shouldComponentUpdate will always return true.

export default function finalPropsSelectorFactory(
  dispatch,
  { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options }
) {
  // initMapStateToProps
  // function  => initProxySelector; mapStateToProps => mapToPropsProxy ;see: /src/connect/wrapMapToProps
  // missing => initConstantSelector;  mapStateToProps => constantSelector; see: /src/connect/wrapMapToProps
  const mapStateToProps = initMapStateToProps(dispatch, options)
  // initMapDispatchToProps
  // function => initProxySelector; mapStateToProps => mapToPropsProxy ;see: /src/connect/wrapMapToProps
  // missing => initConstantSelector; mapStateToProps => constantSelector; see: /src/connect/wrapMapToProps
  // object => initConstantSelector; mapStateToProps => constantSelector; see: /src/connect/wrapMapToProps
  const mapDispatchToProps = initMapDispatchToProps(dispatch, options)
  // initMergeProps
  // omit =>  defaultMergeProps; defaultMergeProps see: /src/connect/mergeProps
  // function => initMergePropsProxy; mergeProps => see: /src/connect/mergeProps
  const mergeProps = initMergeProps(dispatch, options)

  if (process.env.NODE_ENV !== 'production') {
    verifySubselectors(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options.displayName
    )
  }

  const selectorFactory = options.pure
    ? pureFinalPropsSelectorFactory
    : impureFinalPropsSelectorFactory
  // selectorFactory => pureFinalPropsSelector or impureFinalPropsSelector
  // return handleSubsequentCalls or handleFirstCall
  return selectorFactory(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    dispatch,
    options
  )
}
