/** @jsxImportSource react */
import type { DialogueEntry } from '../services/rdvDecideurService';

interface DialogueSectionProps {
  dialogues: DialogueEntry[];
  onDialogueChange: (index: number, value: string) => void;
  onScoreChange?: (index: number, score: string) => void;
  onTrainerCommentChange?: (index: number, comment: string) => void;
  isViewMode?: boolean;
  isFormateur?: boolean;
}

export function DialogueSection({ 
  dialogues, 
  onDialogueChange, 
  onScoreChange,
  onTrainerCommentChange,
  isViewMode,
  isFormateur 
}: DialogueSectionProps) {
  return (
    <div className="space-y-4">
      {dialogues.map((dialogue, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex-1">
            <div className={`rounded-lg ${dialogue.role === 'commercial' ? 'bg-blue-50' : 'bg-pink-50'}`}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">
                    {dialogue.role === 'commercial' ? 'Vous (commercial):' : 'Le client:'}
                  </span>
                  {dialogue.description && (
                    <span className="text-sm text-gray-600 italic">{dialogue.description}</span>
                  )}
                </div>
                <textarea
                  value={dialogue.text}
                  onChange={(e) => onDialogueChange(index, e.target.value)}
                  disabled={isFormateur || isViewMode}
                  className={`w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-opacity-50 ${
                    dialogue.role === 'commercial' 
                      ? 'bg-blue-50 focus:ring-blue-300 border-blue-200' 
                      : 'bg-pink-50 focus:ring-pink-300 border-pink-200'
                  }`}
                  placeholder="Écrivez votre réponse ici..."
                  style={{
                    minHeight: '100px',
                    height: 'auto',
                    resize: 'none',
                    overflow: 'hidden'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>
            </div>
          </div>

          <div className="w-1/3">
            <div className="space-y-3">
              {isFormateur && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Note {dialogue.role === 'commercial' ? '(0-2)' : '(0 ou 0.25)'}
                    </label>
                    <input
                      type="text"
                      value={dialogue.score || ''}
                      onChange={(e) => onScoreChange?.(index, e.target.value)}
                      className="w-full p-2 border rounded-md bg-white"
                      placeholder={`Note ${dialogue.role === 'commercial' ? '(0, 1, 2)' : '(0, 0.25)'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Commentaire
                    </label>
                    <textarea
                      value={dialogue.trainerComment || ''}
                      onChange={(e) => onTrainerCommentChange?.(index, e.target.value)}
                      className="w-full min-h-[100px] p-2 border rounded-md bg-white"
                      placeholder="Commentaire du formateur..."
                    />
                  </div>
                </>
              )}

              {!isFormateur && (
                <div className="bg-gray-50 p-3 rounded-md">
                  {dialogue.score && (
                    <div className="mb-2">
                      <span className="font-medium">Note : </span>
                      <span className={`${Number(dialogue.score) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dialogue.score}
                      </span>
                    </div>
                  )}
                  {dialogue.trainerComment && (
                    <div>
                      <span className="font-medium">Commentaire : </span>
                      <p className="text-gray-700 mt-1">{dialogue.trainerComment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
