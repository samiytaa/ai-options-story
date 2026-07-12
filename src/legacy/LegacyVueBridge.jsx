import { useEffect, useRef } from 'react';
import { createApp } from 'vue';
import LegacyApp from '../App.vue';

export default function LegacyVueBridge() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return undefined;

    const app = createApp(LegacyApp);
    app.mount(mountRef.current);

    return () => {
      app.unmount();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}
