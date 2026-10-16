export default function Piece({ type, color = 'white', className = '' }) {
  return <img className={`chess-piece ${className}`}
    src={`/assets/pieces/${color === 'white' ? 'w' : 'b'}${type.toUpperCase()}.svg`}
    alt="" aria-hidden="true" draggable="false" />;
}
