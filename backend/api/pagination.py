from typing import Optional
from fastapi import Query
from django.db.models import QuerySet


class Pagination:
    def __init__(self, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit

    def apply(self, qs: QuerySet) -> tuple[list, dict]:
        total = qs.count()
        items = list(qs[self.offset:self.offset + self.limit])
        meta = {
            "total": total,
            "page": self.page,
            "limit": self.limit,
            "pages": (total + self.limit - 1) // self.limit if total else 0,
            "has_next": self.offset + self.limit < total,
            "has_prev": self.page > 1,
        }
        return items, meta


def paginated_response(items: list, meta: dict) -> dict:
    return {"data": items, "meta": meta}
