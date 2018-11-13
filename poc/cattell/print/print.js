window.cattell = (function (exports,bitBuffer) {
    'use strict';

    // Copied and heavily modified from: https://github.com/mathiasbynens/koi8-u
    const DEC_ARRAY = ['\u2500', '\u2502', '\u250C', '\u2510', '\u2514', '\u2518', '\u251C', '\u2524', '\u252C', '\u2534', '\u253C', '\u2580', '\u2584', '\u2588', '\u258C', '\u2590', '\u2591', '\u2592', '\u2593', '\u2320', '\u25A0', '\u2219', '\u221A', '\u2248', '\u2264', '\u2265', '\xA0', '\u2321', '\xB0', '\xB2', '\xB7', '\xF7', '\u2550', '\u2551', '\u2552', '\u0451', '\u0454', '\u2554', '\u0456', '\u0457', '\u2557', '\u2558', '\u2559', '\u255A', '\u255B', '\u0491', '\u045E', '\u255E', '\u255F', '\u2560', '\u2561', '\u0401', '\u0404', '\u2563', '\u0406', '\u0407', '\u2566', '\u2567', '\u2568', '\u2569', '\u256A', '\u0490', '\u040E', '\xA9', '\u044E', '\u0430', '\u0431', '\u0446', '\u0434', '\u0435', '\u0444', '\u0433', '\u0445', '\u0438', '\u0439', '\u043A', '\u043B', '\u043C', '\u043D', '\u043E', '\u043F', '\u044F', '\u0440', '\u0441', '\u0442', '\u0443', '\u0436', '\u0432', '\u044C', '\u044B', '\u0437', '\u0448', '\u044D', '\u0449', '\u0447', '\u044A', '\u042E', '\u0410', '\u0411', '\u0426', '\u0414', '\u0415', '\u0424', '\u0413', '\u0425', '\u0418', '\u0419', '\u041A', '\u041B', '\u041C', '\u041D', '\u041E', '\u041F', '\u042F', '\u0420', '\u0421', '\u0422', '\u0423', '\u0416', '\u0412', '\u042C', '\u042B', '\u0417', '\u0428', '\u042D', '\u0429', '\u0427', '\u042A'];
    function decodeChar(byteValue) {
        if (byteValue < 0x80) {
            return String.fromCharCode(byteValue);
        }
        else {
            return DEC_ARRAY[byteValue & 0x7F];
        }
    }
    function decode(input) {
        let result = '';
        let byte;
        for (byte of input) {
            result += decodeChar(byte);
        }
        return result;
    }

    // Copied and slightly modified from: https://github.com/beatgammit/base64-js
    const lookup = [];
    const revLookup = [];
    {
        const code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        for (let i = 0, len = code.length; i < len; ++i) {
            lookup[i] = code[i];
            revLookup[code.charCodeAt(i)] = i;
        }
        // Support decoding URL-safe base64 strings, as Node.js does.
        // See: https://en.wikipedia.org/wiki/Base64#URL_applications
        revLookup['-'.charCodeAt(0)] = 62;
        revLookup['_'.charCodeAt(0)] = 63;
    }
    function getLens(b64) {
        const len = b64.length;
        if (len & 3) {
            throw new Error('Invalid string. Length must be a multiple of 4');
        }
        // Trim off extra bytes after placeholder bytes are found
        // See: https://github.com/beatgammit/base64-js/issues/42
        let validLen = b64.indexOf('=');
        if (validLen === -1) {
            validLen = len;
        }
        // 0 to 3 characters of padding so total length is a multiple of 4
        const placeHoldersLen = 3 - ((validLen + 3) & 3);
        return [validLen, placeHoldersLen];
    }
    // base64 is 4/3 + up to two characters of the original data
    function byteLength(b64) {
        const [validLen, placeHoldersLen] = getLens(b64);
        return _byteLength(validLen, placeHoldersLen);
    }
    function _byteLength(validLen, placeHoldersLen) {
        return (((validLen + placeHoldersLen) * 3) >> 2) - placeHoldersLen;
    }
    function toByteArray(b64) {
        let i;
        let tmp;
        const lens = getLens(b64);
        const [validLen, placeHoldersLen] = lens;
        const arr = new Uint8Array(_byteLength(validLen, placeHoldersLen));
        let curByte = 0;
        // if there are placeholders, only get up to the last complete 4 chars
        const len = placeHoldersLen
            ? validLen - 4
            : validLen;
        for (i = 0; i < len; i += 4) {
            tmp =
                revLookup[b64.charCodeAt(i)] << 18 |
                    revLookup[b64.charCodeAt(i + 1)] << 12 |
                    revLookup[b64.charCodeAt(i + 2)] << 6 |
                    revLookup[b64.charCodeAt(i + 3)];
            arr[curByte++] = tmp >> 16 & 0xFF;
            arr[curByte++] = tmp >> 8 & 0xFF;
            arr[curByte++] = tmp & 0xFF;
        }
        if (placeHoldersLen === 2) {
            arr[curByte] =
                revLookup[b64.charCodeAt(i)] << 2 |
                    revLookup[b64.charCodeAt(i + 1)] >> 4;
        }
        else if (placeHoldersLen === 1) {
            tmp =
                revLookup[b64.charCodeAt(i)] << 10 |
                    revLookup[b64.charCodeAt(i + 1)] << 4 |
                    revLookup[b64.charCodeAt(i + 2)] >> 2;
            arr[curByte++] = tmp >> 8 & 0xFF;
            arr[curByte] = tmp & 0xFF;
        }
        return arr;
    }

    // Modified from https://gist.github.com/chitchcock/5112270
    // which originally modified this one: http://automationwiki.com/index.php?title=CRC-16-CCITT
    const crcTable = [
        0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5,
        0x60c6, 0x70e7, 0x8108, 0x9129, 0xa14a, 0xb16b,
        0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
        0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
        0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c,
        0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
        0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b,
        0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
        0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
        0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738,
        0xf7df, 0xe7fe, 0xd79d, 0xc7bc, 0x48c4, 0x58e5,
        0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
        0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969,
        0xa90a, 0xb92b, 0x5af5, 0x4ad4, 0x7ab7, 0x6a96,
        0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
        0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
        0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03,
        0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
        0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6,
        0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
        0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
        0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb,
        0xd10c, 0xc12d, 0xf14e, 0xe16f, 0x1080, 0x00a1,
        0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
        0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c,
        0xe37f, 0xf35e, 0x02b1, 0x1290, 0x22f3, 0x32d2,
        0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
        0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
        0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447,
        0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
        0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2,
        0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
        0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
        0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827,
        0x18c0, 0x08e1, 0x3882, 0x28a3, 0xcb7d, 0xdb5c,
        0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
        0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0,
        0x2ab3, 0x3a92, 0xfd2e, 0xed0f, 0xdd6c, 0xcd4d,
        0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
        0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
        0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba,
        0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
        0x2e93, 0x3eb2, 0x0ed1, 0x1ef0
    ];
    function crc16(sequence) {
        let crc = 0xFFFF;
        let c;
        let j;
        for (c of sequence) {
            c &= 0xFF;
            j = (c ^ (crc >> 8)) & 0xFF;
            crc = crcTable[j] ^ (crc << 8);
        }
        return ((crc ^ 0) & 0xFFFF);
    }

    function decodeAnswer(bitStream) {
        const bit2 = bitStream.readBits(2, false);
        switch (bit2) {
            case 0b01: return 'A';
            case 0b10: return 'B';
            case 0b11: return 'C';
            default: return '';
        }
    }
    function decodeGender(bitStream) {
        const bit2 = bitStream.readBits(2, false);
        switch (bit2) {
            case 0b01: return 'M';
            case 0b10: return 'F';
            default: return '';
        }
    }
    function decodeAge(bitStream) {
        const bit6 = bitStream.readBits(6, false);
        return bit6 === 0 ? 0 : 15 + bit6;
    }
    function convert64StringToBitStream(string64, sizeInBytes) {
        const bitStream = new bitBuffer.BitStream(new ArrayBuffer(sizeInBytes));
        for (const byte of toByteArray(string64)) {
            bitStream.writeUint8(byte);
        }
        bitStream.index = 0;
        return bitStream;
    }
    function* readBitStream(bitStream) {
        while (bitStream.bitsLeft > 16) {
            yield bitStream.readUint8();
        }
    }
    function decodeState(string64) {
        const sizeInBytes = byteLength(string64);
        if (sizeInBytes < 51) {
            throw new Error('The provided Cattell test state is not complete');
        }
        const bitStream = convert64StringToBitStream(string64, sizeInBytes);
        const version = bitStream.readBits(2, false);
        if (version !== 0) {
            throw new Error(`Cannot parse an unsupported Cattell state serialization format (v${version})`);
        }
        const position = bitStream.readUint8();
        const answers = new Array(187);
        for (let i = 0; i < 187; i++) {
            answers[i] = decodeAnswer(bitStream);
        }
        const gender = decodeGender(bitStream);
        const age = decodeAge(bitStream);
        const name = decode(readBitStream(bitStream));
        const expectedChecksum = bitStream.readUint16();
        bitStream.index = 0;
        const actualChecksum = crc16(bitStream.readArrayBuffer(sizeInBytes - 2));
        if (actualChecksum !== expectedChecksum) {
            throw new Error(`Cattell state has been corrupted (actual = ${actualChecksum}, expected = ${expectedChecksum})`);
        }
        return {
            position,
            answers,
            profile: {
                gender,
                age,
                name,
            },
        };
    }

    exports.decodeState = decodeState;

    return exports;

}({},window));
