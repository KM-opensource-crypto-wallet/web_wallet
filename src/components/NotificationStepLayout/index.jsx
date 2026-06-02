import s from './NotificationStepLayout.module.css';

/**
 * Shared layout for all 4-step wizard steps.
 * Renders: optional search bar → scrollable list → optional footer button.
 */
const NotificationStepLayout = ({
  search,
  onSearch,
  searchPlaceholder = 'Search...',
  isEmpty,
  emptyText,
  footerLabel,
  onFooterPress,
  footerDisabled,
  children,
}) => (
  <div className={s.container}>
    {onSearch && (
      <div className={s.searchWrapper}>
        <input
          className={s.searchInput}
          type='text'
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
    )}
    <div className={s.listScroll}>
      {isEmpty && emptyText ? (
        <p className={s.emptyText}>{emptyText}</p>
      ) : (
        children
      )}
    </div>
    {footerLabel && (
      <div className={s.footer}>
        <button
          className={s.actionBtn}
          disabled={footerDisabled}
          onClick={onFooterPress}>
          {footerLabel}
        </button>
      </div>
    )}
  </div>
);

export default NotificationStepLayout;
