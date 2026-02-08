import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getProfessionCollection } from './professionService';

/**
 * Calculate trust score based on various factors
 * @param jobsCompleted Number of jobs completed
 * @param rating Average rating
 * @param ratingCount Number of ratings received
 * @param responseTimeAvg Average response time (in minutes)
 * @param cancellationRate Rate of job cancellations
 * @returns Trust score between 0-100
 */
export const calculateTrustScore = (
  jobsCompleted: number,
  rating: number,
  ratingCount: number,
  responseTimeAvg?: number,
  cancellationRate?: number
): number => {
  // Base score from rating (weighted heavily)
  let trustScore = 0;
  
  // Rating component (0-60 points) - weighted heavily
  // Rating of 4.5+ gives full 60 points, lower ratings scale proportionally
  const ratingComponent = Math.min(60, (rating / 5.0) * 60);
  trustScore += ratingComponent;
  
  // Rating count bonus (0-10 points) - more ratings = more trust
  const ratingCountBonus = Math.min(10, ratingCount * 0.2); // 0.2 points per rating up to 50 ratings
  trustScore += ratingCountBonus;
  
  // Jobs completed bonus (0-20 points) - more jobs = more trust
  const jobsCompletedBonus = Math.min(20, jobsCompleted * 0.1); // 0.1 points per job up to 200 jobs
  trustScore += jobsCompletedBonus;
  
  // Response time bonus (0-5 points) - faster response = more trust
  // If response time is provided and is good (under 10 mins)
  if (responseTimeAvg !== undefined) {
    if (responseTimeAvg <= 5) {
      trustScore += 5; // Excellent response time
    } else if (responseTimeAvg <= 10) {
      trustScore += 3; // Good response time
    } else if (responseTimeAvg <= 30) {
      trustScore += 1; // Average response time
    }
    // Slow response time doesn't penalize but doesn't reward either
  }
  
  // Cancellation rate penalty (up to -5 points) - fewer cancellations = more trust
  if (cancellationRate !== undefined) {
    if (cancellationRate > 0.2) { // Over 20% cancellations
      trustScore -= 5;
    } else if (cancellationRate > 0.1) { // Over 10% cancellations
      trustScore -= 3;
    } else if (cancellationRate > 0.05) { // Over 5% cancellations
      trustScore -= 1;
    }
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, Math.round(trustScore)));
};

/**
 * Updates the trust score for a worker in Firestore
 * @param workerId ID of the worker
 * @param profession Worker's profession
 * @param jobsCompleted Number of jobs completed
 * @param rating Average rating
 * @param ratingCount Number of ratings
 * @param responseTimeAvg Average response time (optional)
 * @param cancellationRate Cancellation rate (optional)
 */
export const updateWorkerTrustScore = async (
  workerId: string,
  profession: string,
  jobsCompleted: number,
  rating: number,
  ratingCount: number,
  responseTimeAvg?: number,
  cancellationRate?: number
): Promise<number> => {
  try {
    const collectionName = getProfessionCollection(profession);
    const workerRef = doc(db, collectionName, workerId);
    
    // Calculate the new trust score
    const trustScore = calculateTrustScore(
      jobsCompleted,
      rating,
      ratingCount,
      responseTimeAvg,
      cancellationRate
    );
    
    // Update the worker document with the new trust score
    await updateDoc(workerRef, {
      trustScore: trustScore,
      updatedAt: new Date()
    });
    
    console.log(`✅ Trust score updated for ${profession} ${workerId}: ${trustScore}%`);
    
    return trustScore;
  } catch (error) {
    console.error('Error updating trust score:', error);
    throw error;
  }
};

/**
 * Fetches the current worker data and recalculates trust score
 * @param workerId ID of the worker
 * @param profession Worker's profession
 * @returns Updated trust score
 */
export const recalculateTrustScore = async (
  workerId: string,
  profession: string
): Promise<number> => {
  try {
    const collectionName = getProfessionCollection(profession);
    const workerRef = doc(db, collectionName, workerId);
    const workerDoc = await getDoc(workerRef);
    
    if (!workerDoc.exists()) {
      throw new Error(`Worker ${workerId} does not exist in ${collectionName}`);
    }
    
    const data = workerDoc.data();
    
    const jobsCompleted = data.jobsCompleted || 0;
    const rating = data.rating || 0;
    const ratingCount = data.ratingCount || 0;
    
    // These might not exist in the document, so we'll pass undefined if not present
    const responseTimeAvg = data.responseTimeAvg;
    const cancellationRate = data.cancellationRate;
    
    return await updateWorkerTrustScore(
      workerId,
      profession,
      jobsCompleted,
      rating,
      ratingCount,
      responseTimeAvg,
      cancellationRate
    );
  } catch (error) {
    console.error('Error recalculating trust score:', error);
    throw error;
  }
};