import { Component, type ReactNode } from 'react';

export class PreviewBoundary extends Component<{ children: ReactNode; gallery?: boolean }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error
      ? <div className="empty-state"><h2>Не удалось открыть вариант</h2><p>Попросите агента проверить ошибку в консоли.</p>{this.props.gallery && <a href="#/">Все прототипы</a>}</div>
      : this.props.children;
  }
}
