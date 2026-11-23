type Props = {
  top: string
  bottom: string
  /** Shows the top line in a faded style, for placeholder text. */
  placeholder?: boolean
  className?: string
}

/** A blank meme template with classic top and bottom captions. */
export function CaptionFrame({ top, bottom, placeholder = false, className = '' }: Props) {
  return (
    <div className={`frame ${className}`}>
      <p className={`caption caption-top${placeholder ? ' is-placeholder' : ''}`}>{top}</p>
      <p className="caption caption-bottom">{bottom}</p>
    </div>
  )
}
