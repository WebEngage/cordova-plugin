#import <Foundation/Foundation.h>

// Returns `value` as a complete JavaScript string literal (including the surrounding double quotes),
// so it can be placed in JavaScript source passed to evalJs without breaking out of the string.
// A quote, backslash, newline or script-like text inside `value` stays data. A nil value becomes the
// text "(null)", which is what the old '%@' formatting delivered to JS.
static inline NSString *WEGJSStringLiteral(NSString *value) {
    NSString *text = [value isKindOfClass:[NSString class]] ? value : @"(null)";
    NSData *data = [NSJSONSerialization dataWithJSONObject:@[text] options:0 error:nil];
    NSString *array = data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : nil;
    if (array.length < 2) {
        return @"\"\"";
    }
    // The JSON array is `["..."]`; keep only the quoted string in the middle.
    NSString *literal = [array substringWithRange:NSMakeRange(1, array.length - 2)];
    // JSON leaves U+2028/U+2029 unescaped; older JavaScript engines treat them as line terminators.
    literal = [literal stringByReplacingOccurrencesOfString:@" " withString:@"\\u2028"];
    literal = [literal stringByReplacingOccurrencesOfString:@" " withString:@"\\u2029"];
    return literal;
}
