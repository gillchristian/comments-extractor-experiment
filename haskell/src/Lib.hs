{-# LANGUAGE OverloadedStrings #-}

module Lib
  ( someFunc,
  )
where

import Data.Text.IO hiding (putStrLn)
import Text.Parsec
import Text.Parsec.Char
import Text.Parsec.Combinator
import Text.Parsec.Text
import Prelude hiding (readFile)

data AST
  = LineComment String (Int, Int)
  | BlockComment String (Int, Int)
  | CharNode Char
  | StringLiteral String
  deriving (Show)

lineComment :: Parser AST
lineComment = do
  _ <- string "//"
  str <- manyTill anyChar (try endOfLine)
  pure $ LineComment str (0, 1)

blockComment :: Parser AST
blockComment = do
  _ <- string "/*"
  str <- manyTill anyChar $ try $ string "*/"
  pure $ BlockComment str (0, 1)

stringLiteral :: Parser AST
stringLiteral = do
  str <- between (char '\'') (char '\'') (many $ noneOf "'")
  pure $ StringLiteral str

charNode :: Parser AST
charNode = CharNode <$> anyChar

code :: Parser AST
code =
  choice [try lineComment, try blockComment, try stringLiteral, charNode]

isComment :: AST -> Bool
isComment (LineComment _ _) = True
isComment (BlockComment _ _) = True
isComment _ = False

someFunc :: IO ()
someFunc = do
  input <- readFile "input.solidity"
  let res = parse (many code) "..." input
  case res of
    Right nodes -> mapM_ print $ filter isComment nodes
    Left err -> print err
