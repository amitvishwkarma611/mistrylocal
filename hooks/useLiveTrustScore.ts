import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getProfessionCollection } from '../services/professionService';

interface LiveTrustScoreData {
  trustScore: number;
  rating: number;
  jobsCompleted: number;
  ratingCount: number;
}

export const useLiveTrustScore = (workerId: string, profession: string) => {
  const [trustScoreData, setTrustScoreData] = useState<LiveTrustScoreData>({
    trustScore: 0,
    rating: 0,
    jobsCompleted: 0,
    ratingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workerId || !profession) {
      setLoading(false);
      return;
    }

    const collectionName = getProfessionCollection(profession);
    const workerRef = doc(db, collectionName, workerId);

    const unsubscribe = onSnapshot(
      workerRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTrustScoreData({
            trustScore: data.trustScore || 0,
            rating: data.rating || 0,
            jobsCompleted: data.jobsCompleted || 0,
            ratingCount: data.ratingCount || 0
          });
        } else {
          setTrustScoreData({
            trustScore: 0,
            rating: 0,
            jobsCompleted: 0,
            ratingCount: 0
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to worker profile:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [workerId, profession]);

  return { trustScoreData, loading, error };
};