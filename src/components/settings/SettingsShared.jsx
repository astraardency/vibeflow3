import React from 'react';
import { ChevronRight } from 'lucide-react';

export const ListItem = ({ icon, title, subtitle, onClick }) => (
  <div className="settings-list-item focusable" role="button" tabIndex="0" onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}>
    {icon && <div className="settings-item-icon">{icon}</div>}
    <div className="settings-item-text">
      <span className="settings-item-title">{title}</span>
      {subtitle && <span className="settings-item-subtitle">{subtitle}</span>}
    </div>
    <ChevronRight size={20} className="settings-item-arrow" />
  </div>
);

export const ToggleItem = ({ title, subtitle, checked, onChange, customSliderClass }) => (
  <div className="settings-toggle-item focusable" role="button" tabIndex="0" onClick={() => onChange({ target: { checked: !checked } })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange({ target: { checked: !checked } }); } }}>
    <div className="settings-item-text">
      <span className="settings-item-title">{title}</span>
      {subtitle && <span className="settings-item-subtitle">{subtitle}</span>}
    </div>
    <label className="toggle-switch" style={{ pointerEvents: 'none' }}>
      <input type="checkbox" checked={checked} readOnly tabIndex="-1" />
      <span className={"toggle-slider " + (customSliderClass || "")}></span>
    </label>
  </div>
);

export const RadioItem = ({ title, subtitle, selected, onClick }) => (
  <div className="settings-radio-item focusable" role="button" tabIndex="0" onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}>
    <div className="settings-item-text">
      <span className="settings-item-title">{title}</span>
      {subtitle && <span className="settings-item-subtitle">{subtitle}</span>}
    </div>
    <div className={"custom-radio " + (selected ? 'selected' : '')}>
      <div className="radio-inner"></div>
    </div>
  </div>
);
