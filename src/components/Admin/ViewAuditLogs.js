import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import './ViewAuditLogs.css';

/**
 * Formats a duration in seconds into a HH:MM:SS string.
 * @param {number} totalSeconds The total seconds to format.
 * @returns {string} The formatted time string.
 */
const formatTime = (totalSeconds) => {
    if (typeof totalSeconds !== 'number' || totalSeconds < 0) {
        return '00:00:00';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const ViewAuditLogs = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                setLoading(true);
                setError('');
                const timeAuditsRef = collection(db, 'timeAudits');
                const q = query(timeAuditsRef, orderBy('completionDate', 'desc'));
                const auditSnapshot = await getDocs(q);

                if (auditSnapshot.empty) {
                    setAuditLogs([]);
                    setLoading(false);
                    return;
                }

                const usersCache = new Map();
                const coursesCache = new Map();

                const logsData = await Promise.all(auditSnapshot.docs.map(async (logDoc) => {
                    const log = logDoc.data();

                    let userDisplay = log.userId;
                    if (!usersCache.has(log.userId)) {
                        const userRef = doc(db, 'users', log.userId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            const u = userSnap.data();
                            usersCache.set(log.userId, `${u.firstName} ${u.lastName} (${u.email})`);
                        }
                    }
                    userDisplay = usersCache.get(log.userId) || log.userId;

                    let courseDisplay = log.courseId;
                    if (!coursesCache.has(log.courseId)) {
                        const courseRef = doc(db, 'courses', log.courseId);
                        const courseSnap = await getDoc(courseRef);
                        if (courseSnap.exists()) {
                            coursesCache.set(log.courseId, courseSnap.data().title);
                        }
                    }
                    courseDisplay = coursesCache.get(log.courseId) || log.courseId;

                    return {
                        id: logDoc.id,
                        user: userDisplay,
                        course: courseDisplay,
                        totalTime: formatTime(log.totalTimeSeconds),
                        completionDate: log.completionDate.toDate().toLocaleString(),
                    };
                }));

                setAuditLogs(logsData);
            } catch (err) {
                console.error("Error fetching audit logs:", err);
                setError('Failed to load audit logs.');
            } finally {
                setLoading(false);
            }
        };

        fetchAuditLogs();
    }, []);

    if (loading) return <p>Loading audit logs...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="audit-logs-container">
            <h3>Course Completion Audit Logs</h3>
            {auditLogs.length === 0 ? (
                <p>No course completion logs found.</p>
            ) : (
                <table className="audit-logs-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Course</th>
                            <th>Total Time Spent</th>
                            <th>Completion Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auditLogs.map(log => (
                            <tr key={log.id}>
                                <td>{log.user}</td>
                                <td>{log.course}</td>
                                <td>{log.totalTime}</td>
                                <td>{log.completionDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ViewAuditLogs;