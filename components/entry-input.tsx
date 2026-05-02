"use client"

import { useEffect, useState, useRef, type FormEvent } from "react"
import { ArrowUp, Mic, Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface EntryInputProps {
  onSubmit: (content: string) => Promise<void>
  disabled?: boolean
}

export function EntryInput({ onSubmit, disabled }: EntryInputProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Detect Web Speech API only after hydration, to avoid SSR/CSR mismatch.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasSpeechSupport(
        "webkitSpeechRecognition" in window || "SpeechRecognition" in window
      )
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = content.trim()
    if (!value || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(value)
      setContent("")
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
      textareaRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  // Voice input via Web Speech API
  const toggleVoiceInput = () => {
    if (
      typeof window === "undefined" ||
      (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window))
    ) {
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setContent((prev) => (prev ? `${prev} ${transcript}` : transcript))
      // resize after voice input
      requestAnimationFrame(() => {
        if (textareaRef.current) autoResize(textareaRef.current)
      })
    }

    recognition.start()
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm",
          "transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
        )}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            autoResize(e.target)
          }}
          onKeyDown={handleKeyDown}
          placeholder="how's it going?"
          disabled={disabled || isSubmitting}
          rows={1}
          className="flex-1 resize-none border-none bg-transparent px-2 py-2 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          autoComplete="off"
        />

        {hasSpeechSupport && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={disabled || isSubmitting}
            className={cn(
              "rounded-lg p-2 transition-colors",
              isListening
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        <button
          type="submit"
          disabled={!content.trim() || disabled || isSubmitting}
          className={cn(
            "rounded-lg bg-primary p-2 text-primary-foreground transition-all",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "hover:bg-primary/90 active:scale-95"
          )}
          aria-label="Send"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        log what you did, or tell me how you&apos;re feeling. i&apos;ll figure it out.
      </p>
    </form>
  )
}
