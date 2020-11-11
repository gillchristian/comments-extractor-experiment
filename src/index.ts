import * as E from "fp-ts/Either"
import {pipe} from "fp-ts/function"
import * as P from "parser-ts/Parser"
import * as C from "parser-ts/char"
import * as S from "parser-ts/string"
import {stream} from "parser-ts"

interface LineComment {
  type: "LineComment"
  value: string
}

interface BlockComment {
  type: "BlockComment"
  value: string
}

interface StringLiteral {
  type: "StringLiteral"
  str: string
}

interface Char {
  type: "Char"
  char: string
}

type Comment = LineComment | BlockComment

type Code = Char | StringLiteral | Comment

const mkLineComment = (value: string): LineComment => ({type: "LineComment", value})
const mkBlockComment = (value: string): BlockComment => ({type: "BlockComment", value})
const mkChar = (char: string): Char => ({type: "Char", char})
const mkStringLiteral = (str: string): StringLiteral => ({type: "StringLiteral", str})

const isComment = (token: Code): token is Comment => token.type === "LineComment" || token.type === "BlockComment"

// ---

const singleQuotedString: P.Parser<string, String> = P.surroundedBy(C.char("'"))(
  S.many(P.either(S.string("\\'"), () => C.notChar("'")))
)

const anyChar = P.sat<string>((_) => true)

const lineCommentStart = S.string("//")

const blockCommentStart = S.string("/*")
const blockCommentEnd = S.string("*/")

const lineUntilEnd = P.manyTill(
  P.sat((s: string) => s !== "\n"),
  S.string("\n")
)

const lineComment = pipe(
  P.seq(lineCommentStart, () => lineUntilEnd),
  P.map((chars) => chars.join("")),
  P.map(mkLineComment)
)

const blockComment = pipe(
  P.seq(blockCommentStart, () => P.manyTill(anyChar, blockCommentEnd)),
  P.map((chars) => chars.join("")),
  P.map(mkBlockComment)
)

const char = pipe(anyChar, P.map(mkChar))

const stringLit = pipe(
  S.doubleQuotedString,
  P.alt(() => singleQuotedString),
  P.map(mkStringLiteral)
)

const code: P.Parser<string, Code[]> = P.many(
  pipe(
    lineComment,
    P.alt<string, Comment>(() => blockComment),
    P.alt<string, Code>(() => stringLit),
    P.alt<string, Code>(() => char)
  )
)

const parseCommentsFromCode: P.Parser<string, Comment[]> = pipe(
  code,
  P.map((tokens) => tokens.filter(isComment))
)

const input = `contract Foo {}

 // line comment

// line comment  /* fasdfasd */

/* /* block comment */

/* block comment */
contract Contract /* inlined block comment */ {
    function foo(/* another inline comment */) public {
        string s = "// \\"double quotes";
        // a comment here in between strings
        string s2 = '// \\'single quotes';
    }
}
`

pipe(
  input.split(""),
  stream.stream,
  parseCommentsFromCode,
  E.fold(
    (error) => console.log({error}),
    (result) => console.log(result.value)
  )
)

// Parser<string[]> => Parser<string> => Parser<LineComment>
//
// Parser<Comment[]>
