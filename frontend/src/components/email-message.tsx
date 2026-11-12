import { Fragment, type ReactNode } from 'react';

interface EmailMessageProps {
  text: string;
  className?: string;
}

/**
 * Affiche un message e-mail en texte brut (sauts de ligne + **gras**)
 * sans injecter de HTML : tout le contenu est rendu comme du texte React.
 */
export function EmailMessage({
  text,
  className = 'report-email-preview__body',
}: EmailMessageProps) {
  return (
    <div className={className}>
      {text.split('\n').map((line, index) =>
        line === '' ? (
          <br key={index} />
        ) : (
          <p key={index}>{renderInline(line)}</p>
        ),
      )}
    </div>
  );
}

function renderInline(line: string): ReactNode[] {
  return line
    .split(/(\*\*.*?\*\*)/g)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}
