# pymysql Lambda Layer 설정 가이드

Bedrock Lambda에서 pymysql을 사용하기 위해 Lambda Layer를 생성해야 합니다.

## Layer 생성 방법

```bash
mkdir python
pip install pymysql -t python/
zip -r pymysql_layer.zip python/
```

## AWS Lambda에 Layer 등록

1. AWS 콘솔 → Lambda → Layers → "Create layer" 클릭
2. 이름: `pymysql-layer` 입력
3. `pymysql_layer.zip` 파일 업로드
4. 호환 런타임: `Python 3.12` (또는 사용 중인 Python 버전) 선택
5. "Create" 클릭

## Lambda 함수에 Layer 연결

1. Bedrock Lambda 함수 페이지 → Layers 섹션 → "Add a layer" 클릭
2. "Custom layers" 선택 → `pymysql-layer` 선택
3. "Add" 클릭

> **참고:** `lambda_function.py`는 태스크 5.1에서 작성합니다.
