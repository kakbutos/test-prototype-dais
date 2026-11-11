import { useMemo, useRef, useState } from 'react';
import { Button, TextField, ModalDF } from '@daisforge/ui';
import { Canvas, TableCanvas, type ColumnConfig, type SortColumn } from '@daisforge/ui/components/TableCanvas';
import { formatNumber, initialRows, type CollectionItem } from './data';

export function Collection({ title = 'Коллекция' }: { title?: string }) {
  const [rows, setRows] = useState<CollectionItem[]>(() => structuredClone(initialRows));
  const [filter, setFilter] = useState('Все');
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const groupState = useState<string[]>([]);
  const sorting = useState<readonly SortColumn[]>([]);
  const selection = useState<ReadonlySet<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('10');
  const [error, setError] = useState('');
  const [tableEpoch, setTableEpoch] = useState(0);
  const snapshot = useRef<CollectionItem[] | null>(null);
  const visible = rows.filter(row => (filter === 'Все' || row.block === filter) && (tab === 'all' || row.score >= 0.8));
  const found = visible.filter(row => Object.values(row).some(value => String(value).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))));
  const totals: CollectionItem = { id: 'total', name: 'Итого', block: '', score: 0, quantity: 0, points: 0, shelfA: 0, shelfB: 0 };
  for (const row of found) for (const key of ['quantity', 'points', 'shelfA', 'shelfB'] as const) totals[key] += row[key];
  const columns = useMemo<ColumnConfig<CollectionItem, CollectionItem>[]>(() => [
    { key: 'name', name: 'Название предмета', width: 310, sortingType: 'stringSort', editingCell: { component: 'inputString' }, renderSummaryCell: () => 'Итого' },
    { key: 'id', name: 'Ключ', width: 185 },
    { key: 'block', name: 'Цвет', width: 135, rowsGrouping: { columnGroupLabel: 'Цвет' } },
    { key: 'score', name: 'Оценка', width: 115, sortingType: 'numberSort', renderCell: ({ row }) => typeof row.score === 'number' ? <Canvas.Container alignItems="center" padding={12}><Canvas.Badge text={row.score.toFixed(1).replace('.', ',')} view="accent" customBackgroundColor="#975bf4" customColor="#ffffff" size="s" /></Canvas.Container> : '' },
    ...(['quantity', 'points', 'shelfA', 'shelfB'] as const).map((key, i): ColumnConfig<CollectionItem, CollectionItem> => ({ key, name: ['Количество', 'Баллы', 'Полка A', 'Полка B'][i], width: 180, sortingType: 'numberSort', editingCell: { component: 'inputNumber' }, contentFormat: { type: 'number', decimalSeparator: ',', thousandSeparator: ' ', alignContent: 'right', minimumFractionDigits: 2, maximumFractionDigits: 2 }, renderSummaryCell: ({ row }) => formatNumber(row[key]) })),
  ], []);
  const updateVisible = (changed: CollectionItem[]) => {
    const byId = new Map(changed.map(row => [row.id, row]));
    setRows(previous => previous.map(row => byId.get(row.id) ?? row));
  };
  const reset = () => { setRows(structuredClone(initialRows)); setFilter('Все'); setTab('all'); setQuery(''); groupState[1]([]); sorting[1]([]); selection[1](new Set()); snapshot.current = null; setTableEpoch(v => v + 1); };
  function create() {
    const count = Number(amount.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(count) || count < 0) { setError('Введите название и неотрицательное количество.'); return; }
    setRows(previous => [...previous, { id: crypto.randomUUID(), name: name.trim(), block: filter === 'Все' ? 'Коралловые' : filter, score: 0.6, quantity: count, points: 0, shelfA: count / 2, shelfB: count / 2 }]);
    setName(''); setAmount('10'); setError(''); setCreating(false);
  }
  return <main className="collection-page">
    <div className="page-title-row"><div><span className="eyebrow">ДЕМО · КОЛЛЕКЦИЯ ПРЕДМЕТОВ</span><h1>{title}</h1></div><Button size="s" view="clear" onClick={reset}>Сбросить демо</Button></div>
    <div className="filters-row">
      <div className="tabs" role="tablist" aria-label="Список предметов"><Button role="tab" aria-selected={tab === 'all'} view={tab === 'all' ? 'default' : 'clear'} size="s" onClick={() => setTab('all')}>Все предметы</Button><Button role="tab" aria-selected={tab === 'priority'} view={tab === 'priority' ? 'default' : 'clear'} size="s" onClick={() => setTab('priority')}>С высокой оценкой</Button></div>
      <div className="block-filters" aria-label="Цвет">{['Все', 'Коралловые', 'Мятные', 'Лиловые'].map(block => <Button key={block} size="s" view={filter === block ? 'secondary' : 'clear'} aria-pressed={filter === block} onClick={() => setFilter(block)}>{block}</Button>)}</div>
      <Button className="create-action" size="s" view="accent" onClick={() => setCreating(true)}>Добавить предмет</Button>
    </div>
    <section className="metrics" aria-label="Показатели"><div><span>Количество</span><strong data-testid="quantity-total">{formatNumber(totals.quantity)}</strong></div><div><span>Баллы</span><strong>{formatNumber(totals.points)}</strong></div><div><span>Предметы</span><strong data-testid="row-count">{found.length}</strong></div><div><span>Выбрано строк</span><strong data-testid="selection-count">{selection[0].size}</strong></div></section>
    <section className="table-surface" aria-label="Таблица предметов" data-testid="table-surface">
      <TableCanvas key={tableEpoch} rows={visible} columnConfig={columns} bottomSummaryRows={[totals]} tableConfig={{
        containerStyle: { height: 'max(450px, calc(100vh - 370px))' },
        rowSize: { default: 'big', showInControl: true },
        resizableColumn: true,
        searching: { enabled: true, searchQueryState: [query, setQuery], debounceDelay: 100 },
        editing: { rowKeyGetter: row => row.id, onRowsChange: updateVisible, onEnableEditing: enable => { snapshot.current = structuredClone(rows); enable(); }, onCancel: disable => { if (snapshot.current) setRows(snapshot.current); snapshot.current = null; disable(); }, onSave: disable => { snapshot.current = null; disable(); } },
        selecting: { state: selection, rowKeyGetter: row => row.id, showDefault: true },
        rowsGrouping: { rowKeyGetter: row => row.id, groupByState: groupState },
        sorting: { state: sorting },
        summaryRows: { showDefault: true, showInControl: true },
        columnsControl: { enable: true, hiding: true, pinning: true, reorderingHeader: true, pinnedDefault: ['name'] },
        fullScreenEnabled: true,
      }} />
    </section>
    <p className="table-caption">Демонстрационные данные · Редактируйте ячейки, группируйте строки и меняйте колонки. Изменения сбрасываются при перезагрузке или выходе из варианта.</p>
    <ModalDF isOpen={creating} onClose={() => setCreating(false)} closeOnEsc closeOnOverlayClick aria-labelledby="dialog-title"><ModalDF.Main>
      <form className="create-dialog" onSubmit={event => { event.preventDefault(); create(); }}><span className="eyebrow">НОВАЯ ЗАПИСЬ</span><h2 id="dialog-title">Добавить предмет</h2><label htmlFor="collection-name">Название</label><TextField id="collection-name" value={name} onChange={event => setName(event.target.value)} placeholder="Например, бумажный кораблик" autoFocus /><label htmlFor="collection-quantity">Количество</label><TextField id="collection-quantity" value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" />{error && <p role="alert">{error}</p>}<div className="dialog-actions"><Button view="clear" type="button" onClick={() => setCreating(false)}>Отмена</Button><Button view="accent" type="submit">Добавить</Button></div></form>
    </ModalDF.Main></ModalDF>
  </main>;
}
