// AI Summary: A React component that parses a string for markdown-style links ([text](url))
// and renders them as clickable elements that open in the system's external browser.
// It enhances user experience by making URLs in text content interactive and secure.

import React from 'react';

interface LinkifiedTextProps {
  text: string;
}

const handleLinkClick = (
  e: React.MouseEvent<HTMLAnchorElement>,
  url: string
) => {
  e.preventDefault();
  window.electronBridge.appShell.openExternalURL(url);
};

const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text }) => {
  const parseText = (textToParse: string) => {
    const elements: React.ReactNode[] = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(textToParse)) !== null) {
      const [, linkText, url] = match;
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        elements.push(textToParse.substring(lastIndex, matchIndex));
      }

      elements.push(
        <a
          key={matchIndex}
          href={url}
          onClick={(e) => handleLinkClick(e, url)}
          className="text-blue-600 dark:text-blue-400 hover:underline"
          title={`Open this link in your browser: ${url}`}
        >
          {linkText}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < textToParse.length) {
      elements.push(textToParse.substring(lastIndex));
    }

    return elements.length > 0 ? elements : [textToParse];
  };

  return (
    <span>
      {parseText(text).map((part, index) => (
        <React.Fragment key={index}>{part}</React.Fragment>
      ))}
    </span>
  );
};

export default LinkifiedText;
