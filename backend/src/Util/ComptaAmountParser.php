<?php

declare(strict_types=1);

namespace App\Util;

/**
 * Parses VARCHAR-stored compta amounts (plain "1234.56", display "$1 234,56", CSV imports, etc.) for numeric use.
 */
final class ComptaAmountParser
{
    public static function parseToFloat(string $amount): float
    {
        $s = trim($amount);
        if ('' === $s) {
            return 0.0;
        }

        // Plain numeric from number_format / API (most new rows)
        if (preg_match('/^-?\d+(\.\d+)?$/', $s)) {
            return (float) $s;
        }

        $s = str_replace(["\u{00A0}", '$', '€'], '', $s); // narrow NBSP + currency
        $s = str_replace(' ', '', $s);
        if ('' === $s) {
            return 0.0;
        }

        // Ends with ",dd" → European decimal (optional thousand dots or spaces already removed)
        if (preg_match('/,\d{1,2}$/', $s)) {
            $s = str_replace('.', '', $s);
            $s = str_replace(',', '.', $s);
        } else {
            $s = str_replace(',', '', $s);
        }

        if (!is_numeric($s)) {
            return 0.0;
        }

        return (float) $s;
    }
}
