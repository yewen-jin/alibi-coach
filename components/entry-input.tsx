"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Mic, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface EntryInputProps {
  onSubmit: (content: string) => Promise<void>
  disabled?: boolean
}

export function EntryInput({ onSubmit, disabled }: EntryInputProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent("")
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Voice input support (Web Speech API)
  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setContent((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }

    recognition.start()
  }

  const hasSpeechSupport = typeof window !== "undefined" && 
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 bg-card rounded-xl border border-border p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you just do?"
          disabled={disabled || isSubmitting}
          className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-foreground placeholder:text-muted-foreground text-lg"
          autoComplete="off"
        />
        
        {hasSpeechSupport && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={disabled || isSubmitting}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isListening 
                ? "bg-primary text-primary-foreground animate-pulse" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
        
        <button
          type="submit"
          disabled={!content.trim() || disabled || isSubmitting}
          className={cn(
            "p-2 rounded-lg bg-primary text-primary-foreground transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:bg-primary/90 active:scale-95"
          )}
          aria-label="Add entry"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Just did something? Log it here. Every little thing counts.
      </p>
    </form>
  )
}
