import type {
  PropsWithChildren,
  ReactNode,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from 'react';

type InfoTableProps = PropsWithChildren<{
  className?: string;
}> &
  Omit<TableHTMLAttributes<HTMLTableElement>, 'className' | 'children'>;

export function InfoTable({
  className,
  children,
  ...rest
}: InfoTableProps): JSX.Element {
  const tableClassName = ['info-table', className].filter(Boolean).join(' ');

  return (
    <table className={tableClassName} {...rest}>
      <tbody>{children}</tbody>
    </table>
  );
}

type InfoTableRowProps = {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelProps?: ThHTMLAttributes<HTMLTableCellElement>;
  valueProps?: TdHTMLAttributes<HTMLTableCellElement>;
};

export function InfoTableRow({
  label,
  value,
  className,
  labelProps,
  valueProps,
}: InfoTableRowProps): JSX.Element {
  const rowClassName = className ?? undefined;
  const { className: labelClassNameOverride, ...labelRest } = labelProps ?? {};
  const { className: valueClassNameOverride, ...valueRest } = valueProps ?? {};
  const labelClassName = ['key', labelClassNameOverride].filter(Boolean).join(' ');
  const valueClassName = ['value', valueClassNameOverride].filter(Boolean).join(' ');

  return (
    <tr className={rowClassName}>
      <th scope="row" className={labelClassName} {...labelRest}>
        {label}
      </th>
      <td className={valueClassName} {...valueRest}>
        {value}
      </td>
    </tr>
  );
}

type InfoTableCategoryRowProps = PropsWithChildren<{
  className?: string;
  colSpan?: number;
}>;

export function InfoTableCategoryRow({
  children,
  className,
  colSpan = 2,
}: InfoTableCategoryRowProps): JSX.Element {
  const rowClassName = ['category', className].filter(Boolean).join(' ');

  return (
    <tr className={rowClassName}>
      <td colSpan={colSpan}>{children}</td>
    </tr>
  );
}
