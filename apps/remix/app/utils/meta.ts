import { i18n, type MessageDescriptor } from '@lingui/core';

export const appMetaTags = (title?: MessageDescriptor) => {
  return [
    {
      title: title ? `${i18n._(title)} - claim.me` : 'claim.me',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
  ];
};
