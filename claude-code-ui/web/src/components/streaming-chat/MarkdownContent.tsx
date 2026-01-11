import { memo, lazy, Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const MermaidDiagram = lazy(() => import('./MermaidDiagram'))

interface Props {
  content: string
}

export default memo(function MarkdownContent({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const codeString = String(children).replace(/\n$/, '')

          // Handle mermaid diagrams
          if (match && match[1] === 'mermaid') {
            return (
              <Suspense fallback={<div className="text-xs text-gray-500 p-2">Loading diagram...</div>}>
                <MermaidDiagram code={codeString} />
              </Suspense>
            )
          }

          if (match) {
            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: '0.5rem 0', borderRadius: '0.375rem', fontSize: '0.75rem' }}
              >
                {codeString}
              </SyntaxHighlighter>
            )
          }

          return (
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          )
        },
        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc ml-4 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 my-2">{children}</ol>,
        li: ({ children }) => <li className="my-1">{children}</li>,
        p: ({ children }) => <p className="my-2">{children}</p>,
        a: ({ href, children }) => (
          <a href={href} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-600 pl-4 my-2 text-gray-400 italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <table className="border-collapse my-2 text-sm">
            {children}
          </table>
        ),
        th: ({ children }) => (
          <th className="border border-gray-700 px-3 py-1 bg-gray-800">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-700 px-3 py-1">{children}</td>
        ),
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
})
