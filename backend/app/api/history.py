from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.session import get_session
from app.database.models import Generation
from app.schemas import HistoryResponse, GenerationHistoryItem, GenerationDetail

router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """Get paginated list of generations."""
    # Count total
    count_stmt = select(func.count(Generation.id))
    total_result = await session.exec(count_stmt)
    total = total_result.one()

    # Get paginated results
    offset = (page - 1) * page_size
    stmt = (
        select(Generation)
        .order_by(Generation.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.exec(stmt)
    generations = result.all()

    items = [
        GenerationHistoryItem(
            id=g.id,
            audio_url=f"/static/outputs/{g.id}.mp3",
            transcript_url=f"/static/outputs/{g.id}.json",
            created_at=g.created_at,
            voice_id=g.voice_id,
            text_preview=g.text[:100] + ("..." if len(g.text) > 100 else ""),
        )
        for g in generations
    ]

    return HistoryResponse(generations=items, total=total)


@router.get("/history/{generation_id}", response_model=GenerationDetail)
async def get_generation(
    generation_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Get a single generation by ID."""
    stmt = select(Generation).where(Generation.id == generation_id)
    result = await session.exec(stmt)
    generation = result.first()

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found"
        )

    return GenerationDetail(
        id=generation.id,
        audio_url=f"/static/outputs/{generation.id}.mp3",
        transcript_url=f"/static/outputs/{generation.id}.json",
        created_at=generation.created_at,
        voice_id=generation.voice_id,
        text=generation.text,
        duration=generation.duration,
    )


@router.delete("/history/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generation(
    generation_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete a generation and its associated files."""
    stmt = select(Generation).where(Generation.id == generation_id)
    result = await session.exec(stmt)
    generation = result.first()

    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found"
        )

    # Delete files
    import os
    try:
        if os.path.exists(generation.audio_path):
            os.unlink(generation.audio_path)
        if os.path.exists(generation.transcript_path):
            os.unlink(generation.transcript_path)
    except OSError:
        pass  # Files might not exist, that's ok

    # Delete from database
    await session.delete(generation)
    await session.commit()