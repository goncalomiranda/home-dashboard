interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  change?: string;
  changeType?: 'success' | 'danger' | 'info';
  changeLabel?: string;
}

export default function StatCard({ title, value, icon, change, changeType = 'success', changeLabel }: StatCardProps) {
  return (
    <div className="col-xl-3 col-sm-6 mb-xl-0 mb-4">
      <div className="card">
        <div className="card-header p-2 ps-3">
          <div className="d-flex justify-content-between">
            <div>
              <p className="text-sm mb-0 text-capitalize">{title}</p>
              <h4 className="mb-0">{value}</h4>
            </div>
            <div className="icon icon-md icon-shape bg-gradient-dark shadow-dark shadow text-center border-radius-lg">
              <i className="material-symbols-rounded opacity-10">{icon}</i>
            </div>
          </div>
        </div>
        <hr className="dark horizontal my-0" />
        {change && (
          <div className="card-footer p-2 ps-3">
            <p className="mb-0 text-sm">
              <span className={`text-${changeType} font-weight-bolder`}>{change} </span>
              {changeLabel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}