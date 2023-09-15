import { Inject, Injectable, Optional } from "@angular/core";
import { TranslateCompiler } from "@ngx-translate/core";
import MessageFormat, { MessageFormatOptions } from "@messageformat/core";
import {
  defaultConfig,
  MESSAGE_FORMAT_CONFIG,
  MessageFormatConfig,
} from "./message-format-config";

/**
 * This compiler expects ICU syntax and compiles the expressions with messageformat.js
 */
@Injectable()
export class TranslateMessageFormatCompiler extends TranslateCompiler {
  private mfCache = new Map<string, MessageFormat>();
  private config: MessageFormatOptions<"string">;

  constructor(
    @Optional()
    @Inject(MESSAGE_FORMAT_CONFIG)
    config?: MessageFormatConfig
  ) {
    super();

    const {
      formatters: customFormatters,
      biDiSupport,
      strictNumberSign: strict,
      currency,
      strictPluralKeys,
    } = {
      ...defaultConfig,
      ...config,
    };

    this.config = {
      customFormatters,
      biDiSupport,
      strict,
      currency,
      strictPluralKeys,
    };
  }

  public compile(value: string, lang: string): (params: any) => string {
    return (params) => {
      try {
        return this.getMessageFormatInstance(lang).compile(value)(params);
      } catch (e) {
        // Ignore this specific type of type error, as for some reason `undefined` is passed as parameter initially, even though that is not the case in the actual code.
        const message =
          typeof e === "object" ? (e as TypeError)?.message : null;
        if (
          typeof message === "string" &&
          message.startsWith("Cannot read properties of undefined (reading '")
        )
          return "";
        throw e;
      }
    };
  }

  public compileTranslations(translations: any, lang: string): any {
    if (typeof translations === "string") {
      return this.compile(translations, lang);
    }

    return Object.keys(translations).reduce<{ [key: string]: any }>(
      (acc, key) => {
        const value = translations[key];
        return { ...acc, [key]: this.compileTranslations(value, lang) };
      },
      {}
    );
  }

  private getMessageFormatInstance(locale: string): MessageFormat {
    if (!this.mfCache.has(locale)) {
      this.mfCache.set(
        locale,
        new MessageFormat<"string">(locale, this.config)
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.mfCache.get(locale)!;
  }
}
