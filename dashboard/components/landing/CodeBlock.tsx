interface CodeBlockProps {
  children: React.ReactNode
}

export default function CodeBlock({ children }: CodeBlockProps) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#06050a] p-5 font-mono text-[13px] leading-7 text-white/70">
      {children}
    </pre>
  )
}
