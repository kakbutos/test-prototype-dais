declare module 'virtual:dais-prototype' {
  import type { ComponentType } from 'react';
  export const meta: { title: string; description: string; category: string };
  const Screen: ComponentType;
  export default Screen;
}
