<?php

declare(strict_types=1);

namespace App\Tests\Util;

use App\Util\ComptaAmountParser;
use PHPUnit\Framework\TestCase;

final class ComptaAmountParserTest extends TestCase
{
    public function testPlainNumericFromApi(): void
    {
        self::assertSame(42.5, ComptaAmountParser::parseToFloat('42.50'));
        self::assertSame(1090.0, ComptaAmountParser::parseToFloat('1090.00'));
    }

    public function testDisplayFormatWithDollarAndSpaces(): void
    {
        self::assertSame(1090.0, ComptaAmountParser::parseToFloat('$1 090,00'));
        self::assertSame(12.5, ComptaAmountParser::parseToFloat('$12,50'));
    }

    public function testEuropeanThousands(): void
    {
        self::assertSame(1090.5, ComptaAmountParser::parseToFloat('1.090,50'));
    }

    public function testEmptyReturnsZero(): void
    {
        self::assertSame(0.0, ComptaAmountParser::parseToFloat(''));
        self::assertSame(0.0, ComptaAmountParser::parseToFloat('   '));
    }
}
