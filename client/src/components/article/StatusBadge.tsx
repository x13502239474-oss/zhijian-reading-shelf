import type { ArticleStatus } from '../../types';
import { STATUS_LABEL } from '../../types';

export function StatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}
