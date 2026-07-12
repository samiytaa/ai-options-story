import { useEffect, useMemo, useRef } from 'react';
import { createApp, h, reactive } from 'vue';

function toReactHandlerName(eventName) {
  return `on${String(eventName)
    .split(/[:\-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;
}

export function createVueComponentBridge(VueComponent, options = {}) {
  const {
    displayName = VueComponent?.name || 'VueComponentBridge',
    events = [],
  } = options;

  function VueComponentBridge(allProps) {
    const mountRef = useRef(null);
    const propsRef = useRef(allProps);
    const bridgeStateRef = useRef(null);
    propsRef.current = allProps;

    const eventConfig = useMemo(
      () => events.map((eventName) => ({ eventName, handlerName: toReactHandlerName(eventName) })),
      [],
    );

    useEffect(() => {
      if (!mountRef.current) return undefined;

      const bridgeState = reactive({});
      bridgeStateRef.current = bridgeState;
      const syncProps = (nextProps) => {
        Object.keys(bridgeState).forEach((key) => {
          if (!(key in nextProps)) {
            delete bridgeState[key];
          }
        });

        Object.entries(nextProps).forEach(([key, value]) => {
          if (key.startsWith('on')) return;
          bridgeState[key] = value;
        });
      };

      syncProps(propsRef.current);

      const app = createApp({
        name: `${displayName}Host`,
        render() {
          const listeners = Object.fromEntries(
            eventConfig.map(({ eventName, handlerName }) => [
              eventName,
              (...args) => propsRef.current?.[handlerName]?.(...args),
            ]),
          );

          return h(VueComponent, {
            ...bridgeState,
            ...listeners,
          });
        },
      });

      app.mount(mountRef.current);

      return () => {
        bridgeStateRef.current = null;
        app.unmount();
      };
    }, [eventConfig]);

    useEffect(() => {
      const bridgeState = bridgeStateRef.current;
      if (!bridgeState) return;

      Object.keys(bridgeState).forEach((key) => {
        if (!(key in allProps) || key.startsWith('on')) {
          delete bridgeState[key];
        }
      });

      Object.entries(allProps).forEach(([key, value]) => {
        if (key.startsWith('on')) return;
        bridgeState[key] = value;
      });
    }, [allProps]);

    return <div ref={mountRef} className="h-full w-full" data-vue-bridge={displayName} />;
  }

  VueComponentBridge.displayName = displayName;
  return VueComponentBridge;
}
