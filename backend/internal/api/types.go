package api

type evaluateRequest struct {
	Expression string `json:"expression"`
}

type evaluateResponse struct {
	Value *float64 `json:"value"`
	Msg   *string  `json:"msg"`
}

func success(value float64) evaluateResponse {
	return evaluateResponse{Value: &value}
}

func failure(msg string) evaluateResponse {
	return evaluateResponse{Msg: &msg}
}
