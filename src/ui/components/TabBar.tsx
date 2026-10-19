import { tr } from '../../core/lang';
import { navigate, routeHash, type Route } from '../router';
import { Icon, type IconName } from './Icon';

/** Les onglets, avec leur libellé dans la langue en cours (calculé à l'affichage). */
function tabs(): { route: Route; label: string; icon: IconName }[] {
  return [
    { route: { name: 'home' }, label: tr('Accueil', 'Home'), icon: 'home' },
    { route: { name: 'training' }, label: tr('Entraînement', 'Training'), icon: 'training' },
    { route: { name: 'progress' }, label: tr('Progrès', 'Progress'), icon: 'progress' },
    { route: { name: 'settings' }, label: tr('Réglages', 'Settings'), icon: 'settings' },
  ];
}

export function TabBar({ current }: { current: Route['name'] }) {
  return (
    <nav className="tabbar" aria-label={tr('Navigation principale', 'Main navigation')}>
      <div className="tabbar__inner">
        {tabs().map((tab) => (
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
