import { useEffect, useState, type ComponentType } from 'react';
import { PreviewBoundary } from './PreviewBoundary';
import { Button } from '@daisforge/ui';

type PrototypeModule = { meta: { title: string; description: string; category: string }; default: ComponentType };
const modules = import.meta.glob<PrototypeModule>('./prototypes/*/index.tsx', { eager: true });
const prototypes = Object.entries(modules).map(([file, module]) => ({ id: file.split('/')[2], ...module }));

export function App() {
  const isFile = location.protocol === 'file:';
  const [route, setRoute] = useState(() => location.hash.slice(2));
  const standalone = new URLSearchParams(location.search).get('standalone') === '1';
  const [copied, setCopied] = useState(false);
  useEffect(() => { const change = () => { setRoute(location.hash.slice(2)); setCopied(false); }; addEventListener('hashchange', change); return () => removeEventListener('hashchange', change); }, []);
  const current = prototypes.find(p => p.id === route);
  const Screen = current?.default;
  if (standalone && Screen) return <PreviewBoundary key={route}><Screen /></PreviewBoundary>;
  return <>
    <header className="studio-header">
      <a className="brand" href="#/"><span className="brand-mark">d</span><span>Dais <span className="brand-light">/ прототипы</span></span></a>
      <div className="studio-header-right"><span className="demo-label"><i />{isFile ? 'Чтобы поделиться, отправьте HTML-файл' : 'Демо-среда'}</span>{current && !isFile && <Button size="s" view="clear" onClick={async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Ссылка скопирована' : 'Копировать ссылку'}</Button>}</div>
    </header>
    {Screen ? <><div className="breadcrumb"><a href="#/">Все прототипы</a><span>/</span><span>{current.meta.title}</span></div><PreviewBoundary gallery key={route}><Screen /></PreviewBoundary></>
      : route ? <main className="empty-state"><h1>Такого варианта пока нет</h1><a href="#/">Открыть галерею</a></main>
      : <main className="gallery">
        <div className="gallery-intro"><span className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО ДИЗАЙНЕРА</span><h1>От макета —<br />к живому сценарию.</h1><p>Собирайте варианты на компонентах Dais.<br />Проверяйте взаимодействия и делитесь результатом.</p></div>
        <div className="gallery-heading"><h2>Ваши прототипы <span>{prototypes.length}</span></h2><span>Каждый вариант — отдельная ссылка</span></div>
        <div className="prototype-grid">{prototypes.map(p => <a className="prototype-card" href={`#/${p.id}`} key={p.id}>
          <div className="card-preview" aria-hidden="true"><div className="mini-toolbar"><b /> <i /> <i /></div><div className="mini-table">{Array.from({length: 6}, (_, row) => <div key={row}><span /><span /><span /><span /></div>)}</div><span className="preview-tag">ИНТЕРАКТИВНЫЙ</span></div>
          <div className="card-body"><span className="card-category">{p.meta.category}</span><h3>{p.meta.title}<span>↗</span></h3><p>{p.meta.description}</p></div>
        </a>)}</div>
        <aside className="next-step"><span className="step-number">01</span><div><h3>Добавьте следующий вариант</h3><p>Прикрепите скриншот в чате агента и напишите: «Собери новый прототип по этому макету». Он появится здесь после сохранения.</p></div></aside>
        <footer className="gallery-footer">Dais UI · Демонстрационные данные<span>Каждый вариант открывается с исходными демоданными</span></footer>
      </main>}
  </>;
}
