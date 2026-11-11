import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BodyS, Button, Dropdown, H2, H4, IconButton, MassActionsCounter, MassActionsStatic, PopupProvider, Select, Switch, TextM } from '@daisforge/ui';
import { Canvas, TableCanvas, type ColumnConfig, type SortColumn } from '@daisforge/ui/components/TableCanvas';
import { IconAppsFill, IconMenu, IconSearch, IconCalendarOutline, IconHelpCircleOutline, IconChatOutline, IconBellOutline, IconChevronDown, IconChevronUp, IconChevronLeft, IconClose, IconDotsVerticalCenteredOutline, IconFilter, IconWarningTriangleOutline, IconInfoCircleFill, IconUploadOutline, IconDownload, IconMagic } from '@daisforge/ui/icons';
import { dataOrchid, onDarkTextPrimary } from '@daisforge/ui/tokens';
import { InitiativeForm } from './InitiativeForm';
import { initialRows, formatNumber, parseCsv, type Initiative, type InitiativeFormValues } from './data';
import * as S from './styles';

export const meta = { title: 'Модуль инициатив', description: 'Канвасная таблица инициатив и форма создания по макету.', category: 'Прототип по макету' };
const rowKeyGetter = (row: Initiative) => row.id;
const numericColumns = [['headcount', 'Численность, ПШЕ'], ['cost', 'РОТ, млн ₽'], ['business', 'Бизнес, ПШЕ'], ['q4', 'Q4 на 01.01.26, ПШЕ'], ['q1', 'Q1 на 01.04.26, ПШЕ'], ['q2', 'Q2 на 01.07.26, ПШЕ'], ['q3', 'Q3 на 01.10.26, ПШЕ']] as const;
const csvHeader = ['Название инициативы', 'Плановый год', 'Статус', ...numericColumns.map(([, title]) => title)];
function download(rows: Initiative[], name = 'Инициативы.csv') {
  const cell = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
  const body = [csvHeader, ...rows.map(row => [row.name, row.year, row.status, ...numericColumns.map(([key]) => formatNumber(row[key]))])].map(record => record.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', body], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Initiatives() {
  return <PopupProvider><InitiativesScreen /></PopupProvider>;
}

function InitiativesScreen() {
  const [rows, setRows] = useState<Initiative[]>(() => structuredClone(initialRows));
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('В работе');
  const [year, setYear] = useState('Все годы');
  const [showPlan, setShowPlan] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [bulkCollapsed, setBulkCollapsed] = useState(false);
  const [scoreColors, setScoreColors] = useState<{ background?: string; text?: string }>({});
  const groupState = useState<string[]>([]);
  const sorting = useState<readonly SortColumn[]>([]);
  const selection = useState<ReadonlySet<string>>(new Set(['initiative-2', 'initiative-4']));
  const editing = useState(false);
  const snapshot = useRef<Initiative[] | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    // Canvas fillStyle needs computed colors; it cannot resolve CSS var() tokens.
    const probe = document.createElement('span');
    root.current.append(probe);
    const resolve = (token: string) => {
      probe.style.color = token;
      return getComputedStyle(probe).color;
    };
    setScoreColors({ background: resolve(dataOrchid), text: resolve(onDarkTextPrimary) });
    probe.remove();
  }, []);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timeout); }, [notice]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => { if (!(event.target as Element).closest('[data-menu-anchor]')) setMenu(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
    document.addEventListener('click', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', escape); };
  }, [menu]);
  const visible = useMemo(() => rows.filter(row => (!status || row.status === status) && (year === 'Все годы' || String(row.year) === year)), [rows, status, year]);
  const found = visible.filter(row => Object.values(row).some(value => String(value).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))));
  const totals: Initiative = { ...initialRows[0], id: 'total', name: 'Итого', score: 0, year: 0, status: '' };
  for (const [key] of numericColumns) totals[key] = found.reduce((sum, row) => sum + row[key], 0);
  const columns = useMemo<ColumnConfig<Initiative, Initiative>[]>(() => [
    { key: 'name', name: 'Группировка', width: 300, sortingType: 'stringSort', editingCell: { component: 'inputString' }, rowsGrouping: { columnGroupLabel: 'Инициатива' }, renderSummaryCell: () => 'Итого' },
    { key: 'score', name: 'Оценка', width: 150, sortingType: 'numberSort', renderCell: ({ row }) => <Canvas.Container alignItems="center" justifyContent="center"><Canvas.Badge text={row.score.toFixed(1).replace('.', ',')} size="s" view="accent" customBackgroundColor={scoreColors.background} customColor={scoreColors.text} rightIcon={<IconMagic />} /></Canvas.Container>, renderSummaryCell: () => '' },
    { key: 'year', name: 'Плановый год', width: 150, sortingType: 'numberSort', editingCell: { component: 'inputNumber' }, rowsGrouping: { columnGroupLabel: 'Плановый год' }, renderSummaryCell: () => '' },
    { key: 'status', name: 'Статус', width: 150, rowsGrouping: { columnGroupLabel: 'Статус' }, editingCell: { component: 'select', options: { type: 'constant', options: ['В работе', 'На согласовании', 'Завершена'].map(value => ({ value, text: value })) } }, renderCell: ({ row }) => <Canvas.Container alignItems="center" justifyContent="center"><Canvas.Badge text={row.status} view="accent" transparent size="s" /></Canvas.Container>, renderSummaryCell: () => '' },
    ...numericColumns.map(([key, name], index): ColumnConfig<Initiative, Initiative> => ({ key, name, width: index > 2 ? 158 : 150, sortingType: 'numberSort', editingCell: { component: 'inputNumber' }, contentFormat: { type: 'number', decimalSeparator: ',', thousandSeparator: ' ', alignContent: 'right', minimumFractionDigits: 2, maximumFractionDigits: 2 }, renderSummaryCell: ({ row }) => formatNumber(row[key]),
      renderHeaderCell: index > 2 ? () => <Canvas.Container direction="column" justifyContent="center" padding={{ left: 16, right: 8 }} gap={2}><Canvas.Text>{name}</Canvas.Text><Canvas.Text>Бизнес</Canvas.Text></Canvas.Container> : undefined,
    })),
    ...(showPlan ? [{ key: 'block', name: 'Бизнес-план', width: 220, rowsGrouping: { columnGroupLabel: 'Блок' } }] : []),
  ], [showPlan, scoreColors]);
  const changeRows = (changed: Initiative[]) => { const byId = new Map(changed.map(row => [row.id, row])); setRows(previous => previous.map(row => byId.get(row.id) ?? row)); };
  function changeSelectedStatus(nextStatus: string) {
    const count = rows.filter(row => selection[0].has(row.id)).length;
    setRows(previous => previous.map(row => selection[0].has(row.id) ? { ...row, status: nextStatus } : row));
    setStatus('');
    setNotice(`Статус «${nextStatus}» установлен для инициатив: ${count}`);
  }
  const statusActions = ['В работе', 'На согласовании', 'Завершена'].map(value => ({ value, label: value }));
  function runBulkAction(value: string) {
    if (value === 'download') download(rows.filter(row => selection[0].has(row.id)), 'Выбранные инициативы.csv');
    else if (value === 'clear') selection[1](new Set());
    else if (statusActions.some(item => item.value === value)) changeSelectedStatus(value);
  }
  function changeTab(index: number) {
    if (editing[0]) { editing[1](false); snapshot.current = null; setNotice('Изменения сохранены'); }
    setActiveTab(index);
    if (index === 1) { snapshot.current = structuredClone(rows); editing[1](true); }
    groupState[1](index === 2 ? ['name'] : []);
  }
  function create(values: InitiativeFormValues) {
    const row: Initiative = { ...initialRows[0], id: crypto.randomUUID(), name: values.name, year: Number(values.version.match(/\d{4}/)?.[0] ?? 2027), block: values.block, tribe: values.tribe, product: values.product, description: values.description, inactive: values.inactive };
    setRows(previous => [row, ...previous]); setCreating(false); setQuery(''); setYear('Все годы'); setStatus(''); setNotice('Инициатива создана');
  }
  function clearFilters() { setQuery(''); setStatus(''); setYear('Все годы'); }
  function toggleMenu(value: string) { setMenu(previous => previous === value ? null : value); }
  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const [header, ...records] = parseCsv(await file.text());
      if (header?.[0] !== csvHeader[0] || !records.length) throw new Error('Выберите CSV с колонками из выгрузки «Скачать».');
      const added = records.map((record): Initiative => {
        if (!record[0]?.trim()) throw new Error('У каждой инициативы должно быть название.');
        const numbers = numericColumns.map((_, index) => record[index + 3] ? Number(record[index + 3].replaceAll(/\s/g, '').replace(',', '.')) : 0);
        const year = Number(record[1]);
        if (!numbers.every(Number.isFinite) || !Number.isFinite(year)) throw new Error('Проверьте год и числовые значения в CSV.');
        return { ...initialRows[0], ...Object.fromEntries(numericColumns.map(([key], index) => [key, numbers[index]])), id: crypto.randomUUID(), name: record[0], year, status: record[2] || 'В работе' };
      });
      setRows(previous => [...added, ...previous]); clearFilters(); setNotice(`Загружено инициатив: ${added.length}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось прочитать CSV'); }
  }
  const inform = (text: string) => { setNotice(text); setMenu(null); };
  return <S.Page ref={root}>
    <S.Header>
      <S.Row><S.Brand href="#/" aria-label="Демо — все прототипы"><S.BrandMark><IconAppsFill size="s" color="inherit" /></S.BrandMark><H4>Демо</H4></S.Brand>
        <S.Anchor data-menu-anchor><Button view="secondary" size="s" contentLeft={<IconMenu size="s" />} onClick={() => toggleMenu('services')}>Все сервисы</Button>{menu === 'services' && <S.Popover><TextM>Все сервисы</TextM><Button view="clear" size="s" onClick={() => setMenu(null)}>Модуль инициатив</Button><Button view="clear" size="s" onClick={() => { location.hash = '/'; }}>Галерея прототипов</Button></S.Popover>}</S.Anchor>
      </S.Row>
      <S.HeaderCenter><IconButton aria-label="Поиск по инициативам" size="s" view="secondary" onClick={() => root.current?.querySelector<HTMLInputElement>('input[placeholder="Поиск"]')?.focus()}><IconSearch size="s" /></IconButton>
        <Button size="s" view="secondary" onClick={() => inform('Создавайте инициативы, редактируйте ячейки в режиме правки и группируйте строки через панель таблицы.')}>База знаний</Button>
        <Button size="s" view="secondary" onClick={() => { selection[1](new Set(rows.slice(0, 8).map(row => row.id))); inform('Выбраны 8 инициатив в таблице'); }}>Мои задачи <S.Muted>8</S.Muted></Button>
        <IconButton size="s" view="secondary" aria-label="Плановый год" onClick={() => { setYear(year === 'Все годы' ? '2016' : 'Все годы'); }}><IconCalendarOutline size="s" /></IconButton>
      </S.HeaderCenter>
      <S.HeaderRight><IconButton size="s" view="secondary" aria-label="Помощь" onClick={() => inform('Кнопка «Создать» открывает форму. Поиск, фильтры и группировка доступны в таблице.')}><IconHelpCircleOutline size="s" /></IconButton>
        <IconButton size="s" view="secondary" aria-label="Сообщения" onClick={() => inform('Новых сообщений нет')}><IconChatOutline size="s" /></IconButton>
        <S.Anchor><IconButton size="s" view="secondary" aria-label="Уведомления" onClick={() => inform('Демонстрационная среда готова к работе')}><IconBellOutline size="s" /></IconButton><S.Dot /></S.Anchor>
        <Button size="s" view="secondary" contentLeft={<S.Avatar><BodyS>АА</BodyS></S.Avatar>} contentRight={<IconChevronDown size="xs" />} aria-label="Профиль АА" onClick={() => inform('АА · Лидер продукта')} />
      </S.HeaderRight>
    </S.Header>
    <S.TitleRow><IconButton size="xs" view="secondary" pin="circle-circle" aria-label="Вернуться в галерею" onClick={() => { location.hash = '/'; }}><IconChevronLeft size="xs" /></IconButton><H2>Модуль инициатив</H2><Button view="clear" size="xs" contentRight={<IconChevronDown size="xs" />} onClick={() => inform('Текущая роль: Лидер продукта')}>Лидер продукта</Button></S.TitleRow>
    <S.Actions>
      <S.Segments role="tablist" aria-label="Режим модуля">{['Инициативы', 'Режим правки', 'Каскады / кросс-заказы'].map((label, index) => <Button key={label} role="tab" aria-selected={activeTab === index} size="s" view={activeTab === index ? 'default' : 'clear'} onClick={() => changeTab(index)}>{label}</Button>)}</S.Segments>
      <Switch size="s" hasBackground label="Показать БП" checked={showPlan} onChange={event => setShowPlan(event.target.checked)} />
      <S.Anchor data-menu-anchor><Button size="s" view="secondary" contentLeft={<IconFilter size="s" />} onClick={() => toggleMenu('filter')} aria-expanded={menu === 'filter'}>Фильтр</Button>{(status || year !== 'Все годы') && <S.Dot />}
        {menu === 'filter' && <S.Popover aria-label="Фильтры инициатив"><H4>Фильтр</H4><Select size="s" label="Статус" labelPlacement="outer" value={status || 'Все статусы'} items={['Все статусы', 'В работе', 'На согласовании', 'Завершена'].map(value => ({ value, label: value }))} onChange={(value: string) => setStatus(value === 'Все статусы' ? '' : value)} /><Select size="s" label="Плановый год" labelPlacement="outer" value={year} items={['Все годы', ...new Set(rows.map(row => String(row.year)))].map(value => ({ value, label: value }))} onChange={setYear} /><Button size="s" view="accent" onClick={() => setMenu(null)}>Применить</Button></S.Popover>}</S.Anchor>
      <Button size="s" view="clear" contentLeft={<IconClose size="s" />} onClick={clearFilters}>Сбросить фильтры</Button><S.Spacer />
      {editing[0] && <><Button view="clear" size="s" onClick={() => { if (snapshot.current) setRows(snapshot.current); snapshot.current = null; editing[1](false); setActiveTab(0); }}>Отменить</Button><Button view="secondary" size="s" onClick={() => changeTab(0)}>Сохранить</Button></>}
      <IconButton size="s" view="secondary" aria-label="Проверить инициативы" onClick={() => inform(rows.some(row => !row.name.trim()) ? 'Есть инициативы без названия' : 'Проверка завершена: все инициативы имеют название')}><IconWarningTriangleOutline size="s" /></IconButton>
      <Button size="s" view="secondary" onClick={() => download(found, 'Отчет по инициативам.csv')}>Отчет по инициативам</Button><Button size="s" view="accent" onClick={() => { setMenu(null); setCreating(true); }}>Создать</Button>
    </S.Actions>
    <S.Summary aria-label="Сводные показатели"><S.SummaryLine><S.Muted><BodyS>Численность, ПШЕ</BodyS></S.Muted><BodyS>Всего <S.Negative>90</S.Negative>/88</BodyS><BodyS>Бизнес <S.Negative>80</S.Negative>/70</BodyS><BodyS>ИТ <S.Negative>10</S.Negative>/8</BodyS><S.Divider /><S.Muted><BodyS>Вендоры, млн ₽</BodyS></S.Muted><BodyS>Всего <S.Negative>90</S.Negative>/88</BodyS><BodyS>CAPEX <S.Negative>80</S.Negative>/70</BodyS><BodyS>OPEX <S.Negative>10</S.Negative>/8</BodyS><S.Muted title="План / доступный лимит"><IconInfoCircleFill size="xs" color="inherit" /></S.Muted></S.SummaryLine></S.Summary>
    <S.TableSurface aria-label="Таблица инициатив"><TableCanvas rows={visible} columnConfig={columns} bottomSummaryRows={[totals]} tableConfig={{
      containerStyle: { height: 'max(420px, calc(100dvh - 344px))' }, rowSize: { default: 'big', showInControl: false }, rowHeight: 48, headerRowHeight: 40,
      searching: { enabled: true, searchQueryState: [query, setQuery], debounceDelay: 100, placeholder: 'Поиск' },
      selecting: { state: selection, rowKeyGetter, showDefault: true, showInControl: false }, sorting: { state: sorting }, rowsGrouping: { rowKeyGetter, groupByState: groupState }, resizableColumn: true,
      summaryRows: { showDefault: true, showInControl: false }, columnsControl: { enable: true, hiding: true, pinning: true, reorderingHeader: true, pinnedDefault: ['name'] },
      editing: { rowKeyGetter, onRowsChange: changeRows, enabled: editing, showButtons: false },
      controlBlock: {
        size: 's',
        rightSideInner: [{ text: 'Загрузить', contentLeft: <IconUploadOutline size="s" />, onClick: () => upload.current?.click() }, { text: 'Скачать', contentLeft: <IconDownload size="s" />, onClick: () => download(found) }],
        massActionPanel: { show: false, buttons: [] },
      },
    }} />
      {selection[0].size > 0 && !creating && <S.BulkActions aria-label="Действия с выбранными инициативами">
        <MassActionsStatic position="static"><S.Row>
          <MassActionsCounter selectedCount={selection[0].size} showCheckbox={false} label="Выбрано" />
          {bulkCollapsed ? <Dropdown placement="top" portal="document" items={[
            { value: 'status', label: 'Изменить статус', items: statusActions },
            { value: 'download', label: 'Скачать выбранные', contentLeft: <IconDownload size="s" /> },
            { value: 'clear', label: 'Снять выделение' },
          ]} onItemSelect={item => runBulkAction(String(item.value))}>
            <IconButton size="s" view="secondary" aria-label="Действия с выбранными"><IconDotsVerticalCenteredOutline size="s" /></IconButton>
          </Dropdown> : <>
            <Button size="s" view="clear" onClick={() => selection[1](new Set())}>Сбросить всё</Button>
            <Dropdown placement="top" portal="document" items={statusActions} onItemSelect={item => changeSelectedStatus(String(item.value))}>
              <Button size="s" view="secondary" contentRight={<IconChevronDown size="xs" />}>Изменить статус</Button>
            </Dropdown>
            <Button size="s" view="secondary" contentLeft={<IconDownload size="s" />} onClick={() => runBulkAction('download')}>Скачать выбранные</Button>
          </>}
          <IconButton size="s" view="clear" aria-label={bulkCollapsed ? 'Развернуть массовые действия' : 'Свернуть массовые действия'} onClick={() => setBulkCollapsed(value => !value)}>
            {bulkCollapsed ? <IconChevronUp size="s" /> : <IconChevronDown size="s" />}
          </IconButton>
        </S.Row></MassActionsStatic>
      </S.BulkActions>}
    </S.TableSurface>
    <input type="file" ref={upload} hidden accept=".csv,text/csv" aria-label="Загрузить инициативы из CSV" onChange={importCsv} />
    {creating && <InitiativeForm onClose={() => setCreating(false)} onCreate={create} />}
    {notice && <S.Notice role="status"><BodyS>{notice}</BodyS><IconButton size="xs" view="clear" aria-label="Закрыть уведомление" onClick={() => setNotice('')}><IconClose size="xs" color="inherit" /></IconButton></S.Notice>}
  </S.Page>;
}
