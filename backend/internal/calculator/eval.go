package calculator

import "math"

type evaluator struct {
	numberStack         []float64
	operatorStack       []tokenType
	isExpectingOperator bool
}

func Evaluate(input string) (float64, error) {
	tokens, err := tokenize(input)
	if err != nil {
		return 0, err
	}

	eval := &evaluator{}

	for _, t := range tokens {
		var err error

		switch t.tType {
		case tNumber:
			err = eval.pushNumber(t.value)
		case tLParen, tSqrt:
			err = eval.pushOpen(t.tType)
		case tRParen:
			err = eval.reduceParenthesis()
		default:
			err = eval.pushOperator(t.tType)
		}

		if err != nil {
			return 0, err
		}
	}

	if !eval.isExpectingOperator {
		return 0, ErrInvalidSyntax
	}

	for len(eval.operatorStack) > 0 {
		if eval.topOp() == tLParen || eval.topOp() == tSqrt {
			return 0, ErrUnbalancedParens
		}

		err := eval.reduceOnce()
		if err != nil {
			return 0, err
		}
	}

	if len(eval.numberStack) != 1 {
		return 0, ErrInvalidSyntax
	}
	return eval.numberStack[0], nil
}

func (eval *evaluator) pushNumber(value float64) error {
	if eval.isExpectingOperator {
		return ErrInvalidSyntax
	}

	eval.numberStack = append(eval.numberStack, value)
	eval.isExpectingOperator = true
	return nil
}

func (eval *evaluator) pushOpen(tType tokenType) error {
	if eval.isExpectingOperator {
		return ErrInvalidSyntax
	}

	eval.operatorStack = append(eval.operatorStack, tType)
	return nil
}

func (eval *evaluator) pushOperator(op tokenType) error {
	if !eval.isExpectingOperator {
		switch op {
		case tPlus:
			eval.operatorStack = append(eval.operatorStack, tUnaryPlus)
		case tMinus:
			eval.operatorStack = append(eval.operatorStack, tUnaryMinus)
		default:
			return ErrInvalidSyntax
		}
		return nil
	}

	for len(eval.operatorStack) > 0 && !canPushOp(eval.topOp(), op) {
		err := eval.reduceOnce()
		if err != nil {
			return err
		}
	}

	eval.operatorStack = append(eval.operatorStack, op)
	eval.isExpectingOperator = false
	return nil
}

func (eval *evaluator) reduceOnce() error {
	op := eval.popOp()

	if op == tUnaryPlus || op == tUnaryMinus {
		if len(eval.numberStack) < 1 {
			return ErrInvalidSyntax
		}

		if op == tUnaryMinus {
			eval.numberStack[len(eval.numberStack)-1] = -eval.numberStack[len(eval.numberStack)-1]
		}
		return nil
	}

	if len(eval.numberStack) < 2 {
		return ErrInvalidSyntax
	}

	right := eval.popNum()
	left := eval.popNum()
	res, err := applyOperation(left, right, op)
	if err != nil {
		return err
	}

	eval.numberStack = append(eval.numberStack, res)
	return nil
}

func (eval *evaluator) reduceParenthesis() error {
	if !eval.isExpectingOperator {
		return ErrInvalidSyntax
	}

	for len(eval.operatorStack) > 0 && !(eval.topOp() == tLParen || eval.topOp() == tSqrt) {
		err := eval.reduceOnce()
		if err != nil {
			return err
		}
	}

	if len(eval.operatorStack) == 0 {
		return ErrUnbalancedParens
	}

	paren := eval.popOp()
	if paren == tSqrt {
		if len(eval.numberStack) == 0 {
			return ErrInvalidSyntax
		}
		num := eval.popNum()
		if num < 0 {
			return ErrNegativeRoot
		}
		eval.numberStack = append(eval.numberStack, math.Sqrt(num))
	}

	eval.isExpectingOperator = true
	return nil
}

func (eval *evaluator) topOp() tokenType {
	return eval.operatorStack[len(eval.operatorStack)-1]
}

func (eval *evaluator) popOp() tokenType {
	op := eval.topOp()
	eval.operatorStack = eval.operatorStack[:len(eval.operatorStack)-1]
	return op
}

func (eval *evaluator) popNum() float64 {
	num := eval.numberStack[len(eval.numberStack)-1]
	eval.numberStack = eval.numberStack[:len(eval.numberStack)-1]
	return num
}

func canPushOp(op tokenType, newOp tokenType) bool {
	if newOp == tCaret {
		return getPrecedence(op) <= getPrecedence(newOp)
	}
	return getPrecedence(op) < getPrecedence(newOp)
}

func applyOperation(left float64, right float64, op tokenType) (float64, error) {
	var res float64

	switch op {
	case tPlus:
		res = left + right
	case tMinus:
		res = left - right
	case tStar:
		res = left * right
	case tSlash:
		if right == 0 {
			return 0, ErrDivisionByZero
		}
		res = left / right
	case tPercent:
		res = left * right / 100
	case tCaret:
		res = math.Pow(left, right)
	default:
		return 0, ErrInvalidSyntax
	}

	if math.IsNaN(res) || math.IsInf(res, 0) {
		return 0, ErrResultNotFinite
	}

	return res, nil
}

func getPrecedence(tType tokenType) int {
	switch tType {
	case tPlus, tMinus:
		return 1
	case tStar, tSlash, tPercent:
		return 2
	case tUnaryMinus, tUnaryPlus:
		return 3
	case tCaret:
		return 4
	default:
		return 0
	}
}
