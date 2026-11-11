# API компонентов установленной версии

Это короткие примеры композиции, а не замена API установленных пакетов. Перед применением сверяйте экспорты и свойства с локальными типами; используемые версии смотрите в package.json, package-lock.json и установленном пакете. После обновления зависимостей перепроверьте примеры.

## Где искать

Начинайте с публичных экспортов `node_modules/@daisforge/ui/index.d.ts`, `icons/index.d.ts` и `tokens/index.d.ts`. Реэкспорт может вести в `node_modules/@salutejs/sdds-finai/types/components/<Component>/`; базовые типы — в `@salutejs/plasma-new-hope/types/components/`. Читать эти файлы можно, импортировать в приложение следует через публичные модули Dais.

MCP помогает выбрать компонент; при несовпадении его примера с установленными типами используйте установленный API. Типы проверяют допустимость props, но не заменяют проверку их поведения. Не делайте полную сборку ради каждого предположения: сначала проверьте выбранные экспорты, затем используйте dev и typecheck по завершении группы правок.

## Tabs

Управление выбранной вкладкой и клавиатурным индексом задаётся явно. `value` у TabItem предназначен для отображаемого значения рядом с текстом, не используйте его как скрытый ID.

```tsx
const [index, setIndex] = useState(0);
<Tabs index={index} size="s">
  {['Общее', 'Детали'].map((label, itemIndex) => (
    <TabItem key={label} size="s" itemIndex={itemIndex}
      onIndexChange={setIndex} selected={index === itemIndex}
      aria-selected={index === itemIndex} onClick={() => setIndex(itemIndex)}>
      {label}
    </TabItem>
  ))}
</Tabs>
```

Контент активной панели переключайте тем же состоянием; свяжите вкладки с панелями через доступные ARIA-атрибуты. Проверьте клики, фокус и клавиатуру в готовом экране.

## NumberFormat

Разделитель задавайте явно по формату экрана. Пример для десятичной запятой:

```tsx
const [amount, setAmount] = useState('');
<NumberFormat label="План" value={amount}
  decimalSeparator="," decimalScale={2}
  onChange={event => setAmount(event?.target.value ?? '')} />
```

Строка ввода с запятой не является числом JavaScript. Перед расчётами отдельно нормализуйте разрешённые разделители. Проверьте сценарий `12,5`, очистку и нужное количество знаков. Не переносите правила числового поля в другие поля автоматически.

## DatePicker

Для строкового состояния и формата даты:

```tsx
const [date, setDate] = useState<string | undefined>();
<DatePicker label="Дата" value={date} format="DD.MM.YYYY"
  onChangeValue={(_event, value) => setDate(value)} />
```

Для новых сценариев используйте onChangeValue; onChange отмечен в базовых типах как устаревший. Проверьте ручной ввод и выбор даты календарём, если они нужны макету.

## Toast

Состояние показа и таймаут задаёт ToastProvider/useToast. timeout относится к showToast, а не к произвольному свойству самого Toast:

```tsx
function SaveAction() {
  const { showToast } = useToast();
  return <Button view="accent" size="s"
    onClick={() => showToast({ text: 'Сохранено', timeout: 3000 })}>
    Сохранить
  </Button>;
}
<ToastProvider><SaveAction /></ToastProvider>
```

Используйте это сообщение после фактического изменения состояния, а не вместо реализации сохранения.

## Иконки, кнопки и оформление

Ищите экспорт по смыслу в установленном наборе, не угадывайте суффиксы Mini/Fill/Outline. Например, IconSearch доступен через `@daisforge/ui/icons`; отсутствие IconSearchMini не означает отсутствия поиска. В примере Button используется view="accent"; его доступность, допустимые размеры и остальные значения сверяйте с типами установленного компонента. Не переносите варианты другого компонента.

Правила styled-components, токенов, типографики и пример IconButton находятся в dais-prototype. Проверяйте применение примеров через TypeScript в текущем проекте; браузерную работоспособность конкретного экрана проверяйте отдельно.
