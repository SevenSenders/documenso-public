import { DateTime } from 'luxon';
import type { Browser } from 'playwright';
import Urlbox, { RenderOptions } from 'urlbox';

import { NEXT_PUBLIC_WEBAPP_URL } from '../../constants/app';
import { type SupportedLanguageCodes, isValidLanguageCode } from '../../constants/i18n';
import { encryptSecondaryData } from '../crypto/encrypt';

export type GetCertificatePdfOptions = {
  documentId: number;
  // eslint-disable-next-line @typescript-eslint/ban-types
  language?: SupportedLanguageCodes | (string & {});
};

export const getCertificatePdf = async ({ documentId, language }: GetCertificatePdfOptions) => {
  const { chromium } = await import('playwright');

  const encryptedId = encryptSecondaryData({
    data: documentId.toString(),
    expiresAt: DateTime.now().plus({ minutes: 5 }).toJSDate().valueOf(),
  });

  if (process.env.NEXT_PRIVATE_URLBOX_API_KEY && process.env.NEXT_PRIVATE_URLBOX_SECRET) {
    const urlbox = Urlbox(
      process.env.NEXT_PRIVATE_URLBOX_API_KEY,
      process.env.NEXT_PRIVATE_URLBOX_SECRET,
    );

    const url = `${NEXT_PUBLIC_WEBAPP_URL()}/__htmltopdf/certificate?d=${encryptedId}&lang=${language || 'en'}`;

    const urlboxOptions: RenderOptions = {
      pdf_page_size: 'a4',
      format: 'pdf',
      quality: 100,
      width: 1080,
      height: 1920,
      url,
    };

    const screenshot = urlbox.generateRenderLink(urlboxOptions);

    const response = await fetch(screenshot, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });

    const result = await response.arrayBuffer();

    return result;
  }

  let browser: Browser;

  if (process.env.NEXT_PRIVATE_BROWSERLESS_URL) {
    // !: Use CDP rather than the default `connect` method to avoid coupling to the playwright version.
    // !: Previously we would have to keep the playwright version in sync with the browserless version to avoid errors.
    browser = await chromium.connectOverCDP(process.env.NEXT_PRIVATE_BROWSERLESS_URL);
  } else {
    browser = await chromium.launch();
  }

  if (!browser) {
    throw new Error(
      'Failed to establish a browser, please ensure you have either a Browserless.io url or chromium browser installed',
    );
  }

  const browserContext = await browser.newContext();

  const page = await browserContext.newPage();

  const lang = isValidLanguageCode(language) ? language : 'en';

  await page.context().addCookies([
    {
      name: 'language',
      value: lang,
      url: NEXT_PUBLIC_WEBAPP_URL(),
    },
  ]);

  await page.goto(`${NEXT_PUBLIC_WEBAPP_URL()}/__htmltopdf/certificate?d=${encryptedId}`, {
    waitUntil: 'networkidle',
    timeout: 10_000,
  });

  const result = await page.pdf({
    format: 'A4',
  });

  await browserContext.close();

  void browser.close();

  return result;
};
