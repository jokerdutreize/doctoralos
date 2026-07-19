import { useState, useEffect, useCallback, useRef } from 'react'

export interface AsyncState<T> {
  status: 'idle' | 'loading' | 'success' | 'error'
  data: T | null
  error: string | null
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  runImmediately = true,
): { state: AsyncState<T>; execute: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    status: runImmediately ? 'loading' : 'idle',
    data: null,
    error: null,
  })

  // Always call the latest version of asyncFn without adding it as a dep
  const latestFn = useRef(asyncFn)
  latestFn.current = asyncFn

  const execute = useCallback(() => {
    setState(s => ({ ...s, status: 'loading', error: null }))
    latestFn.current()
      .then(data => setState({ status: 'success', data, error: null }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          data: null,
          error: e instanceof Error ? e.message : 'Unknown error',
        }),
      )
  }, [])

  useEffect(() => {
    if (runImmediately) execute()
    // execute is stable; runImmediately is a primitive init value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, execute }
}
