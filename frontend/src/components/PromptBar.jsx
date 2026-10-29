import { useState } from 'react'
import { SIZE_PRESETS } from '../lib/constants.js'
import { sizeLabel } from '../lib/format.js'
import Icon from './Icon.jsx'

export default function PromptBar({ disabled, size, onSizeChange, onSubmit }) {
  const [prompt, setPrompt] = useState('')

  function submit(e) {
    e.preventDefault()
    const text = prompt.trim()
    if (!text || disabled) return
    onSubmit(text)
  }

  return (
    <form className="prompt-bar" onSubmit={submit}>
      <input
        className="input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        maxLength={400}
        placeholder="Describe your banner, e.g. Sales promo, 1080×1080"
        aria-label="Describe your banner"
      />
      <select
        className="select size-select"
        value={size}
        onChange={(e) => onSizeChange(e.target.value)}
        aria-label="Banner size"
      >
        {SIZE_PRESETS.map((s) => (
          <option key={s.id} value={s.id}>
            {sizeLabel(s)}
          </option>
        ))}
      </select>
      <button className="btn btn-primary" type="submit" disabled={disabled || !prompt.trim()}>
        <Icon name="sparkle" size={16} />
        {disabled ? 'Generating...' : 'Generate'}
      </button>
    </form>
  )
}
