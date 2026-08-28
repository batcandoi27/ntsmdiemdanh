'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { PetWorldSnapshot, GridCoordinate } from '@/domain/classroom-world/types';
import { getAllBorderCoordinates, getZoneAtCoordinate } from '@/domain/classroom-world/zoning';
import { calculateNextWanderingStep } from '@/domain/classroom-world/wandering';
import { StudentWorldPlot } from '@/types/student-portal';

interface UseWanderingPetsProps {
  plots: StudentWorldPlot[];
  currentPetId?: string;
  myEggColor?: string;
  intervalMs?: number; // default 3500ms
}

export function useWanderingPets({
  plots,
  currentPetId,
  myEggColor,
  intervalMs = 3500
}: UseWanderingPetsProps) {
  const borderCoords = useMemo(() => getAllBorderCoordinates(), []);

  // 1. Khởi tạo danh sách PetWorldSnapshot từ plots & gán Home Base viền
  const initialPetSnapshots: PetWorldSnapshot[] = useMemo(() => {
    return plots.map((plot, idx) => {
      // Gán tọa độ viền cố định nếu chưa có
      const assignedBorder = borderCoords[idx % borderCoords.length] || { x: 0, y: 0 };
      const homePos: GridCoordinate = {
        x: plot.grid_x >= 0 && plot.grid_x < 8 ? plot.grid_x : assignedBorder.x,
        y: plot.grid_y >= 0 && plot.grid_y < 8 ? plot.grid_y : assignedBorder.y
      };

      const level = plot.pet_level ?? 0;
      const isHatched = level >= 1;
      const studentCode = (plot as any).student_code || (plot as any).studentCode || `8A13_${idx + 1 < 10 ? `0${idx + 1}` : idx + 1}`;
      const displayCode = `${studentCode} • Lv.${level}`;

      return {
        petId: plot.pet_id || `pet-${idx}`,
        studentId: plot.id,
        studentCode,
        displayCode,
        classId: plot.class_id,
        anonymousName: plot.anonymous_name || `Linh Vật #${idx + 1}`,
        evolutionBranch: plot.pet_branch || 'cosmic',
        level,
        isHatched,
        isHibernating: false,
        eggBaseColor: plot.pet_id === currentPetId && myEggColor ? myEggColor : plot.egg_base_color,
        homePosition: homePos,
        currentPosition: homePos,
        facingDirection: 1,
        currentZoneType: getZoneAtCoordinate(homePos).type,
        isMoving: false,
        lastMovedAt: Date.now(),
        currentXp: (plot as any).current_xp ?? (plot as any).currentXp ?? (level * 45),
        vitalityPercent: (plot as any).vitality_percent ?? (plot as any).vitalityPercent ?? 100,
        streakDays: (plot as any).streak_days ?? (plot as any).streakDays ?? 1,
        totalCoins: (plot as any).total_coins ?? (plot as any).totalCoins ?? 20,
        competitionScore: (plot as any).competition_score ?? (plot as any).competitionScore ?? 100,
        completedQuestsCount: (plot as any).completed_quests_count ?? (plot as any).completedQuestsCount ?? 0,
        gender: (plot as any).gender || (idx % 2 === 0 ? 'female' : 'male'),
        nicknameChangesLeft: (plot as any).nickname_changes_left ?? (plot as any).nicknameChangesLeft ?? 1,
        evolutionChangesLeft: (plot as any).evolution_changes_left ?? (plot as any).evolutionChangesLeft ?? 3,
        eggColorChangesMonth: (plot as any).egg_color_changes_month ?? (plot as any).eggColorChangesMonth ?? 1,
        rebirthTokensCount: (plot as any).rebirth_tokens_count ?? (plot as any).rebirthTokensCount ?? 0
      };
    });
  }, [plots, borderCoords, currentPetId, myEggColor]);

  const [pets, setPets] = useState<PetWorldSnapshot[]>(initialPetSnapshots);
  const petsRef = useRef<PetWorldSnapshot[]>(pets);
  petsRef.current = pets;

  // Đồng bộ khi plots thay đổi
  useEffect(() => {
    setPets(initialPetSnapshots);
  }, [initialPetSnapshots]);

  // 2. Loop Wandering AI: Mỗi intervalMs, các thú đã nở (Level >= 1) tự động chọn ô tiếp theo
  useEffect(() => {
    const timer = setInterval(() => {
      setPets(currentPets => {
        // Thu thập các ô đang bị chiếm đóng
        const occupied = new Set<string>();
        currentPets.forEach(p => {
          occupied.add(`${p.currentPosition.x},${p.currentPosition.y}`);
        });

        return currentPets.map(pet => {
          // Trứng chưa nở hoặc ngủ đông -> Nằm yên tại Home Base
          if (!pet.isHatched || pet.level <= 0 || pet.isHibernating) {
            return pet;
          }

          // 30% cơ hội thú đứng yên nghỉ ngơi tạo cảm giác tự nhiên
          if (Math.random() < 0.25) {
            return pet;
          }

          // Tính toán bước đi tiếp theo
          const { nextPosition, facingDirection } = calculateNextWanderingStep(pet, occupied);

          const isMoving = nextPosition.x !== pet.currentPosition.x || nextPosition.y !== pet.currentPosition.y;

          return {
            ...pet,
            currentPosition: nextPosition,
            facingDirection,
            currentZoneType: getZoneAtCoordinate(nextPosition).type,
            isMoving,
            lastMovedAt: Date.now()
          };
        });
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return { pets };
}
