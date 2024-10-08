const postModel = require('../models/post')
const mongoose = require('mongoose')
const analyzeText = require('../middleware/contentFilter')

const addComment = async (req, res) => {
    const postId = req.params.postId
    const userId = req.userId
    const { text } = req.body

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: "Invalid postId format" });
    }
    if (!text || text.trim() === '') {
        return res.status(400).json({ message: "Comment text cannot be empty" });
    }

    try {

        //contentFilter - 
        const analysisResult = await analyzeText(text.trim())
        if (analysisResult && analysisResult.tags && analysisResult.tags.length > 0) {
            return res.status(400).json({
                message: `Comment contains offensive language: ${analysisResult.tags.join(', ')}`,
                analysis: analysisResult
            });
        }

        const fetchedPost = await postModel.findById(postId)
        if (!fetchedPost) {
            return res.status(404).json({ message: "post not found" })
        }

        const newComment = {
            commentor: userId,
            text,
            createdAt: Date.now()
        };
        fetchedPost.comments.push(newComment)
        await fetchedPost.save()

        // comment bug fix, username not displaying when adding comments
        const populatedPost = await postModel.findById(postId).populate('comments.commentor', 'username');
        const populatedComment = populatedPost.comments[populatedPost.comments.length - 1];


        return res.status(201).json({ message: "Comment added", comment: populatedComment });




    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }

}

const deleteComment = async (req, res) => {
    const { postId, commentId } = req.params
    const userId = req.userId

    if (!mongoose.Types.ObjectId.isValid(postId) && !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ message: "Invalid postId or commentId format" });
    }

    try {
        const fetchedPost = await postModel.findById(postId)
        if (!fetchedPost) {
            return res.status(404).json({ message: "post not found" })
        }

        const comment = fetchedPost.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (fetchedPost.author.toString() !== userId && comment.commentor.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized to delete this comment" });
        }

        // Filter out the comment to be deleted
        const updatedComments = fetchedPost.comments.filter(comment => !comment._id.equals(commentId));

        // Update the post with the filtered comments
        fetchedPost.comments = updatedComments;
        const updatedPost = await fetchedPost.save();

        res.status(200).json({ message: "Comment deleted", updatedPost });

    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }

}



module.exports = { addComment, deleteComment }

