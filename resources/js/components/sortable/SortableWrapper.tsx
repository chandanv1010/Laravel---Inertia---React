
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type UniqueIdentifier,
  type DragEndEvent,
  type DragStartEvent,
  MeasuringStrategy
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  
} from '@dnd-kit/sortable';
import { useState } from 'react';
import {CSS} from '@dnd-kit/utilities';
import { TPhoto } from '../custom-album';


interface SortableWrapperProps{
    items: TPhoto[],
    children?: React.ReactNode,
    setItems: (items: TPhoto[]) => void,
    columns?: number,
}


export default function SortableWrapper({
    items,
    children,
    setItems,
    columns = 5
}: SortableWrapperProps){

    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Require 5px of movement before activating drag (prevent accidental drag on click)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        
        setActiveId(null) // Reset activeId

        if(!over) return
    
        if (active.id !== over.id) {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);

            setItems(arrayMove(items, oldIndex, newIndex));
        }
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id)
    }

    const handleDragCancel = () => {
        setActiveId(null)
    }

    const activeItem = activeId ? items.find(item => item.id === activeId) : null


    return (
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onDragCancel={handleDragCancel}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always
                }
            }}
        >
            <SortableContext 
                items={items}
                strategy={rectSortingStrategy}
            >
                <div 
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    {children}
                </div>
            </SortableContext>
            <DragOverlay dropAnimation={{duration: 200}}>
                {activeId && activeItem ? (
                    <div 
                        className="opacity-80 shadow-2xl rounded-[5px] overflow-hidden"
                        style={{
                            transform: CSS.Transform.toString({x: 0, y: 0, scaleX: 1.05, scaleY: 1.05})
                        }}
                    >
                        <img src={activeItem.url as string} className="w-full h-[150px] object-cover block" />
                    </div>
                ): null}
            </DragOverlay>
        </DndContext>
    )

}