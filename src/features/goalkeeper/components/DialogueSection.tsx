import React, { useEffect, useRef } from 'react';
import { DialogueSection as DialogueSectionType } from '../types';

interface DialogueSectionProps {
  title: string;
  section: DialogueSectionType;
  isFormateur: boolean;
  isSubmitted: boolean;
  onAddLine: (speaker: 'goalkeeper' | 'commercial') => void;
  onRemoveLine: () => void;
  onUpdateLine: (index: number, text: string) => void;
  onUpdateFeedback: (index: number, feedback: string) => void;
}

export const DialogueSection: React.FC<DialogueSectionProps> = ({
  title,
  section,
  isFormateur,
  isSubmitted,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  onUpdateFeedback,
}) => {
  // Références pour les zones de texte
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const commentDivRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Fonction pour ajuster la hauteur d'un textarea
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${Math.max(element.scrollHeight, 80)}px`;
    }
  };
  
  // Fonction pour ajuster la hauteur d'une div de commentaire
  const adjustCommentDivHeight = (element: HTMLDivElement) => {
    if (element && element.scrollHeight > 0) {
      element.style.height = 'auto';
      element.style.minHeight = '80px';
    }
  };
  
  // Ajuster les hauteurs quand les lignes changent
  useEffect(() => {
    // Ajuster les textareas
    textareaRefs.current.forEach(textarea => {
      if (textarea) adjustTextareaHeight(textarea);
    });
    
    // Ajuster les divs de commentaires
    commentDivRefs.current.forEach(div => {
      if (div) adjustCommentDivHeight(div);
    });
  }, [section.lines]); // Se déclenche quand les lignes changent
  console.log('DialogueSection props:', { title, section, isFormateur, isSubmitted });
  
  if (!section || !section.lines) {
    console.warn('Section or lines is missing:', section);
    return <div>Chargement...</div>;
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-4 text-sm text-gray-500 px-4">
          <div className="col-span-1">N°</div>
          <div className="col-span-2">Intervenant</div>
          <div className="col-span-5">Dialogue</div>
          <div className="col-span-4">Commentaires du Formateur</div>
        </div>

        {section.lines.map((line, index) => {
          console.log(`Rendering line ${index}:`, line);
          return (
            <div key={line.id} className="grid grid-cols-12 gap-4 items-start bg-white rounded-lg">
              <div className="col-span-1 p-4 text-sm text-blue-600">
                {index + 1}
              </div>
              <div className="col-span-2 p-4">
                <div className={`text-sm ${line.speaker === 'goalkeeper' ? 'text-red-600' : 'text-blue-600'}`}>
                  {line.speaker === 'goalkeeper' ? 'Le/La Goalkeeper:' : 'Vous (commercial):'}
                </div>
              </div>
              <div className="col-span-5 p-4">
                <textarea
                  value={line.text || ''}
                  onChange={(e) => onUpdateLine(index, e.target.value)}
                  disabled={isSubmitted || isFormateur}
                  placeholder="Écrivez votre dialogue ici..."
                  className="w-full min-h-[80px] p-2 text-sm border border-gray-200 rounded resize-y focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-700"
                  style={{ 
                    height: 'auto',
                    minHeight: '80px',
                    overflow: 'hidden'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.max(target.scrollHeight, 80)}px`;
                  }}
                />
              </div>
              <div className="col-span-4 p-4">
                {isFormateur ? (
                  <textarea
                    ref={el => textareaRefs.current[index] = el}
                    value={line.feedback || ''}
                    onChange={(e) => onUpdateFeedback(index, e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="w-full min-h-[80px] p-2 text-sm border border-gray-300 rounded resize-y bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    style={{ 
                      height: 'auto',
                      minHeight: '80px',
                      overflow: 'hidden'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.max(target.scrollHeight, 80)}px`;
                    }}
                  />
                ) : (
                  <div 
                    ref={el => commentDivRefs.current[index] = el}
                    className="text-sm text-gray-500 italic p-2 border border-gray-200 rounded min-h-[80px] bg-gray-50 whitespace-pre-wrap overflow-auto"
                    style={{ 
                      height: 'auto', 
                      minHeight: '80px',
                      maxHeight: 'none'
                    }}
                  >
                    {isSubmitted 
                      ? (line.feedback 
                        ? (
                          <div>
                            <div className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded">
                              {line.feedback}
                            </div>
                          </div>
                        ) 
                        : 'Pas de commentaire')
                      : 'Les commentaires et la note apparaîtront ici après la soumission'}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!isSubmitted && !isFormateur && (
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => onAddLine('goalkeeper')}
              className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
            >
              + Goalkeeper
            </button>
            <button
              onClick={() => onAddLine('commercial')}
              className="px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
            >
              + Commercial
            </button>
            <button
              onClick={onRemoveLine}
              className="px-3 py-1 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
              disabled={section.lines.length === 0}
            >
              Supprimer dernier message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
