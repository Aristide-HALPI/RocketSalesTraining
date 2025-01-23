import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import type { Exercise, Resource, ResourceType, EvaluationCriteria, ExerciseMetadata } from '../types/database';

interface ExerciseFormProps {
  initialData?: Exercise;
  onSubmit: (exercise: Exercise) => Promise<void>;
}

export default function ExerciseForm({ initialData, onSubmit }: ExerciseFormProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [difficulty, setDifficulty] = useState<'débutant' | 'intermédiaire' | 'avancé'>(initialData?.difficulty || 'débutant');
  const [duration, setDuration] = useState(initialData?.duration?.toString() || '30');
  const [maxScore, setMaxScore] = useState(initialData?.maxScore?.toString() || '100');
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');
  
  const [resources, setResources] = useState<Resource[]>(initialData?.resources || []);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceDescription, setNewResourceDescription] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceType, setNewResourceType] = useState<ResourceType>('link');

  const [criteria, setCriteria] = useState<EvaluationCriteria[]>(
    initialData?.evaluationGrid.criteria || []
  );
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionDescription, setNewCriterionDescription] = useState('');
  const [newCriterionMaxPoints, setNewCriterionMaxPoints] = useState('10');
  const [newCriterionWeight, setNewCriterionWeight] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      // Validation des critères
      const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
      if (totalWeight !== 100) {
        setError('La somme des pondérations doit être égale à 100%');
        return;
      }

      const currentTime = new Date().toISOString();
      const metadata: ExerciseMetadata = {
        createdAt: initialData?.metadata?.createdAt || currentTime,
        createdBy: initialData?.metadata?.createdBy || currentUser.uid,
        lastUpdated: currentTime,
        updatedBy: currentUser.uid,
        version: (initialData?.metadata?.version || 0) + 1
      };

      const exerciseData: Exercise = {
        id: initialData?.id || '',
        exerciseId: initialData?.exerciseId || crypto.randomUUID(),
        templateId: initialData?.templateId || '',
        templateVersion: initialData?.templateVersion || 1,
        userId: currentUser.uid,
        title,
        description,
        category,
        difficulty,
        maxScore: parseInt(maxScore),
        duration: parseInt(duration),
        instructions,
        resources,
        evaluationGrid: {
          criteria,
          totalWeight: 100
        },
        tags,
        metadata,
        prerequisites: initialData?.prerequisites || [],
        status: initialData?.status || 'draft',
        startedAt: initialData?.startedAt || currentTime,
        submittedAt: initialData?.submittedAt || '',
        timeSpent: initialData?.timeSpent || 0,
        attempts: initialData?.attempts || 0,
        dueDate: initialData?.dueDate || '',
        answers: initialData?.answers || [],
        graded: initialData?.graded || false,
        grade: initialData?.grade || 0,
        createdAt: initialData?.createdAt || currentTime
      };

      await onSubmit(exerciseData);
      navigate('/exercises');
    } catch (err) {
      console.error('Error submitting exercise:', err);
      setError('Une erreur est survenue lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const addResource = () => {
    if (!newResourceTitle || !newResourceUrl) return;

    setResources([
      ...resources,
      {
        title: newResourceTitle,
        description: newResourceDescription,
        url: newResourceUrl,
        type: newResourceType
      }
    ]);

    setNewResourceTitle('');
    setNewResourceDescription('');
    setNewResourceUrl('');
    setNewResourceType('link');
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (!newTag || tags.includes(newTag)) return;
    setTags([...tags, newTag]);
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addCriterion = () => {
    if (!newCriterionName || !newCriterionMaxPoints || !newCriterionWeight) return;

    setCriteria([
      ...criteria,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: newCriterionName,
        description: newCriterionDescription,
        maxPoints: parseInt(newCriterionMaxPoints),
        weight: parseInt(newCriterionWeight)
      }
    ]);

    setNewCriterionName('');
    setNewCriterionDescription('');
    setNewCriterionMaxPoints('10');
    setNewCriterionWeight('0');
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Catégorie
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Difficulté
        </label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as 'débutant' | 'intermédiaire' | 'avancé')}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        >
          <option value="débutant">Débutant</option>
          <option value="intermédiaire">Intermédiaire</option>
          <option value="avancé">Avancé</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Durée (minutes)
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
          min="1"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Score maximum
        </label>
        <input
          type="number"
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
          required
          min="1"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          required
          rows={5}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
        />
      </div>

      {/* Ressources */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Ressources</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Titre"
            value={newResourceTitle}
            onChange={(e) => setNewResourceTitle(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
          
          <input
            type="text"
            placeholder="Description"
            value={newResourceDescription}
            onChange={(e) => setNewResourceDescription(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
          
          <input
            type="text"
            placeholder="URL"
            value={newResourceUrl}
            onChange={(e) => setNewResourceUrl(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
          
          <select
            value={newResourceType}
            onChange={(e) => setNewResourceType(e.target.value as ResourceType)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          >
            <option value="pdf">PDF</option>
            <option value="video">Vidéo</option>
            <option value="link">Lien</option>
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addResource}
          className="w-full sm:w-auto"
        >
          Ajouter une ressource
        </Button>

        <ul className="divide-y divide-gray-200">
          {resources.map((resource, index) => (
            <li key={index} className="py-4 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium">{resource.title}</h4>
                <p className="text-sm text-gray-500">{resource.description}</p>
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:text-teal-500">
                  {resource.url}
                </a>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeResource(index)}
              >
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Tags</h3>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nouveau tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
          
          <Button
            type="button"
            variant="outline"
            onClick={addTag}
          >
            Ajouter
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-teal-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Critères d'évaluation */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Critères d'évaluation</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Nom du critère"
            value={newCriterionName}
            onChange={(e) => setNewCriterionName(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
          
          <input
            type="text"
            placeholder="Description"
            value={newCriterionDescription}
            onChange={(e) => setNewCriterionDescription(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
          
          <input
            type="number"
            placeholder="Points maximum"
            value={newCriterionMaxPoints}
            onChange={(e) => setNewCriterionMaxPoints(e.target.value)}
            min="1"
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
          
          <input
            type="number"
            placeholder="Pondération (%)"
            value={newCriterionWeight}
            onChange={(e) => setNewCriterionWeight(e.target.value)}
            min="0"
            max="100"
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addCriterion}
          className="w-full sm:w-auto"
        >
          Ajouter un critère
        </Button>

        <ul className="divide-y divide-gray-200">
          {criteria.map((criterion, index) => (
            <li key={criterion.id} className="py-4 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium">{criterion.name}</h4>
                <p className="text-sm text-gray-500">{criterion.description}</p>
                <p className="text-sm text-gray-500">
                  Points max: {criterion.maxPoints} | Pondération: {criterion.weight}%
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeCriterion(index)}
              >
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/exercises')}
        >
          Annuler
        </Button>
        
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </form>
  );
}
