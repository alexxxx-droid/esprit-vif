import { navigate, routeHash, type Route } from '../router';
import { Icon, type IconName } from './Icon';

const TABS: { route: Route; label: string; icon: IconName }[] = [
  { route: { name: 'home' }, label: 'Accueil', icon: 'home' },
  { route: { name: 'training' }, label: 'Entraînement', icon: 'training' },
  { route: { name: 'progress' }, label: 'Progrès', icon: 'progress' },
  { route: { name: 'settings' }, label: 'Réglages', icon: 'settings' },
];

export function TabBar({ current }: { current: Route['name'] }) {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      <div className="tabbar__inner">
        {TABS.map((tab) => (
          <a
            key={tab.route.name}
            href={routeHash(tab.route)}
            className="tab"
            aria-current={current === tab.route.name ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigate(tab.route, { replace: true });
            }}
          >
            <span className="tab__icon">
              <Icon name={tab.icon} />
            </span>
            <span className="tab__label">{tab.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
