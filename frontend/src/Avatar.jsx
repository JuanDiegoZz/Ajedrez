const avatars = [
  ['club', 'Club'], ['knight', 'Estratega'], ['rook', 'Fortaleza'],
  ['bishop', 'Diagonal'], ['compass', 'Explorador'], ['shield', 'Guardián'],
];

export function Avatar({ id = 'club', label = 'Avatar', className = '' }) {
  const avatar = avatars.find(([key]) => key === id) ?? avatars[0];
  return <img className={`player-avatar ${className}`} src={`/assets/avatars/${avatar[0]}.svg`} alt="" aria-label={label} />;
}

export function AvatarPicker({ value, onChange }) {
  return <fieldset className="avatar-picker"><legend>Elige un avatar</legend>
    <div>{avatars.map(([id, name]) => <button key={id} type="button" className={`avatar-choice${value === id ? ' selected' : ''}`} aria-pressed={value === id} aria-label={name} onClick={() => onChange(id)}>
      <Avatar id={id} label={name} /><span>{name}</span>
    </button>)}</div>
  </fieldset>;
}
